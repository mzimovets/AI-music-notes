import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Tabs,
  Tab,
  Card,
} from "@heroui/react";

import { useState } from "react";

export default function SongMenu() {
  const [viewType, setViewType] = useState<"table" | "card">();

  return (
    <div>
      <Tabs
        selectedKey={viewType} // ← привязываем состояние к Tabs
        onSelectionChange={(key) => setViewType(key as "table" | "card")}
        variant="solid"
      >
        <Tab titleValue="table" title="Table" />
        <Tab titleValue="card" title="Card" />
      </Tabs>

      {viewType === "card" ? (
        <Card>Привет!</Card>
      ) : (
        <Table aria-label="Список песен">
          <TableHeader>
            <TableColumn>НАЗВАНИЕ</TableColumn>
            <TableColumn>АВТОР</TableColumn>
          </TableHeader>
          <TableBody>
            <TableRow key="1">
              <TableCell>Tony Reichert</TableCell>
              <TableCell>CEO</TableCell>
            </TableRow>
            <TableRow key="2">
              <TableCell>Zoey Lang</TableCell>
              <TableCell>Technical Lead</TableCell>
            </TableRow>
            <TableRow key="3">
              <TableCell>Jane Fisher</TableCell>
              <TableCell>Senior Developer</TableCell>
            </TableRow>
            <TableRow key="4">
              <TableCell>William Howard</TableCell>
              <TableCell>Community Manager</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )}
    </div>
  );
}
