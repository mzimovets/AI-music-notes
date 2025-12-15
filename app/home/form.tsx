"use client";

import { Button, Card, Form, Input } from "@heroui/react";
import { use, useContext, useState } from "react";
import { SongsLibraryContext } from "../providers";
import { postSong } from "@/lib/utils";
import { addSong } from "@/actions/actions";
// import { Input } from "@heroui/input";

export default function FormSong() {
  const [name, setName] = useState("");
  //   Заполнение инпутов не работают
  return (
    <div>
      <Button
        onPress={() => {
          console.log("Button React presse");
          postSong({ name: "Test", docType: "song" }, "testcreate2");
        }}
      >
        React button
      </Button>
      {/* <input
        value={name}
        onClick={(e) => {
          console.log("value", e);
          setName(e.target.value);
        }}
      /> */}
      {/* <Input
        // value={name}
        onClick={(e) => {
          console.log("value", e.target.value);
          setName(e.target.value);
        }}
      /> */}
      <Form action={addSong}>
        <Input name="name" />
        <Button type="submit">Send</Button>
      </Form>
    </div>
  );
}
