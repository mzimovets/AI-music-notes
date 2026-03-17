import { Input } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";

import { categorySongs } from "@/components/constants";

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
  if (field.label === "Категория") {
    const categoryName = categorySongs.find((f) => f.key === category);

    const handleSelectionChange = (keys: any) => {
      const selectedKey = Array.from(keys)[0] as string;
      const selectedCategory = categorySongs.find(
        (cat) => cat.key === selectedKey,
      );

      if (selectedCategory && onChange) {
        onChange(selectedCategory.key);
      }
    };

    return (
      <Select
        className="input-header"
        isRequired={field.required}
        labelPlacement="outside"
        placeholder={placeholder}
        selectedKeys={categoryName?.key ? [categoryName.key] : []}
        onSelectionChange={handleSelectionChange} // callback последний
      >
        {categorySongs.map((category) => (
          <SelectItem
            key={category.key}
            className="input-header"
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
      className="w-full"
      defaultValue={field.value || ""}
      isRequired={field.required}
      placeholder={placeholder}
      onChange={handleInputChange}
    />
  );
};
