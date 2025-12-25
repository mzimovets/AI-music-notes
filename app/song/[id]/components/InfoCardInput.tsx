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
}

export const InfoCardInput = ({ field, placeholder }: InfoCardInputProps) => {
  if (field.label === "Категория") {
    const categoryName = categorySongs.find((f) => f.name === field.value);

    return (
      <Select
        isRequired={field.required}
        selectedKeys={categoryName?.key ? [categoryName.key] : []}
        placeholder={placeholder}
        labelPlacement="outside"
        className="input-header"
      >
        {songs.map((song) => (
          <SelectItem key={song.key} textValue={song.label}>
            {song.label}
          </SelectItem>
        ))}
      </Select>
    );
  }

  return (
    <Input
      placeholder={placeholder}
      defaultValue={field.value || ""}
      className="w-full"
      isRequired={field.required}
    />
  );
};
