"use client";

import { Card, Image } from "@heroui/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useCategories, type SongCategory } from "@/hooks/useCategories";
import { CategoryEditModal } from "@/components/CategoryEditModal";
import { FolderIcon } from "@/components/icons/FolderIcon";

interface AlbumsProps {
  /** Режим редактирования включает регент кнопкой у заголовка */
  isEditing?: boolean;
  /** Песни по категориям — нужны, чтобы не дать удалить непустую */
  songsByCategory?: Record<string, number>;
}

interface CategoryTileProps {
  category: SongCategory;
  isEditing: boolean;
  onOpen: () => void;
}

const CategoryTile = ({ category, isEditing, onOpen }: CategoryTileProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: category.key, disabled: !isEditing });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        touchAction: isEditing ? "none" : undefined,
      }}
      className="flex flex-col items-center w-full"
      {...attributes}
      {...listeners}
    >
      <Card
        onPress={onOpen}
        isPressable
        className="relative w-full aspect-square rounded-xl shadow-md hover:shadow-lg transition-shadow"
      >
        <Image
          alt="Album cover"
          className="object-cover w-full h-full"
          shadow="md"
          src={category.image}
          width="100%"
        />
        {isEditing && (
          <span className="main-font absolute inset-0 z-10 flex items-center justify-center bg-black/35 text-white text-sm rounded-xl">
            Изменить
          </span>
        )}
      </Card>

      <p
        onClick={onOpen}
        className="mt-2 text-center font-medium text-xs sm:text-sm card-header line-clamp-2 w-full cursor-pointer"
      >
        {category.name}
      </p>
    </div>
  );
};

export default function Albums({ isEditing = false, songsByCategory = {} }: AlbumsProps) {
  const router = useRouter();
  const { categories, saveCategories } = useCategories();

  const [editing, setEditing] = useState<SongCategory | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Небольшой порог, иначе на телефоне обычный тап начинает перетаскивание
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const from = categories.findIndex((item) => item.key === active.id);
    const to = categories.findIndex((item) => item.key === over.id);
    if (from < 0 || to < 0) return;

    await saveCategories(arrayMove(categories, from, to));
  };

  const handleTileOpen = (category: SongCategory) => {
    if (isEditing) {
      setEditing(category);
      return;
    }
    router.push(`/playlist/${category.key}`);
  };

  const handleSave = async (item: SongCategory) => {
    const exists = categories.some((c) => c.key === item.key);
    await saveCategories(
      exists
        ? categories.map((c) => (c.key === item.key ? item : c))
        : [...categories, item],
    );
  };

  const handleDelete = async (key: string) => {
    await saveCategories(categories.filter((c) => c.key !== key));
  };

  const grid = (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {categories.map((category) => (
        <CategoryTile
          key={category.key}
          category={category}
          isEditing={isEditing}
          onOpen={() => handleTileOpen(category)}
        />
      ))}

      {isEditing && (
        <button
          type="button"
          onClick={() => setIsCreating(true)}
          className="w-full aspect-square rounded-xl border-2 border-dashed border-[#BD9673] text-[#7D5E42] flex items-center justify-center"
          aria-label="Добавить категорию"
        >
          <FolderIcon className="w-10 h-10" />
        </button>
      )}
    </div>
  );

  return (
    <div className="w-full bg-[#F7F4F1]">
      <div className="m-0">
        {isEditing ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={categories.map((c) => c.key)}
              strategy={rectSortingStrategy}
            >
              {grid}
            </SortableContext>
          </DndContext>
        ) : (
          grid
        )}
      </div>

      <CategoryEditModal
        isOpen={editing !== null || isCreating}
        onClose={() => {
          setEditing(null);
          setIsCreating(false);
        }}
        category={editing}
        songsCount={editing ? (songsByCategory[editing.key] ?? 0) : 0}
        existingKeys={categories.map((c) => c.key)}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </div>
  );
}
