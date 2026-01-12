import { Input } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { songs } from "@/app/home/modalAddScore";
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
    console.log("categoryName, field: ", categoryName, field);
    const handleSelectionChange = (keys: any) => {
      const selectedKey = Array.from(keys)[0] as string;
      const selectedCategory = categorySongs.find(
        (cat) => cat.key === selectedKey
      );
      console.log("selectedKey: ", selectedKey);
      console.log("selectedCategory: ", selectedCategory);
      if (selectedCategory && onChange) {
        console.log("selectedCategory.key: ", selectedCategory.key);
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
        {categorySongs.map((category) => (
          <SelectItem key={category.key} textValue={category.name}>
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
