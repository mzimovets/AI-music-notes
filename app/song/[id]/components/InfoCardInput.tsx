import { Input } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { useCategories } from "@/hooks/useCategories";

interface InfoCardInputProps {
  field: {
    label: string;
    value: string;
    required?: boolean;
  };
  placeholder?: string;
  onChange?: (value: string) => void;
  category: string;
}

export const InfoCardInput = ({
  field,
  placeholder,
  onChange,
  category,
}: InfoCardInputProps) => {
  // Хук вызывается до ветвления — правила хуков не допускают условного вызова
  const { categories } = useCategories();

  if (field.label === "Категория") {
    const categoryName = categories.find((f) => f.key === category);

    const handleSelectionChange = (keys: any) => {
      const selectedKey = Array.from(keys)[0] as string;
      const selectedCategory = categories.find(
        (cat) => cat.key === selectedKey,
      );

      if (selectedCategory && onChange) {
        onChange(selectedCategory.key);
      }
    };

    return (
      <Select
        isRequired={field.required}
        selectedKeys={categoryName?.key ? [categoryName.key] : []}
        placeholder={placeholder}
        labelPlacement="outside"
        onSelectionChange={handleSelectionChange}
        className="input-header"
      >
        {categories.map((category) => (
          <SelectItem
            className="input-header"
            key={category.key}
            textValue={category.name}
          >
            {category.name}
          </SelectItem>
        ))}
      </Select>
    );
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onChange) {
      onChange(e.target.value);
    }
  };

  return (
    <Input
      placeholder={placeholder}
      defaultValue={field.value || ""}
      className="w-full"
      onChange={handleInputChange}
      isRequired={field.required}
    />
  );
};
