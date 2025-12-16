import { Card } from "@heroui/react";

async function HomeContent() {
  let data = await fetch("https://api.vercel.app/blog");
  let posts = await data.json();

  return (
    <section className="flex flex-col items-center justify-center gap-4">
      {/* {posts.map((post: { id: string; title: string }) => (
        <li key={post.id}>{post.title}</li>
      ))} */}
      {posts.map((post: { id: string; title: string }) => (
        <Card key={post.id}>{post.title}</Card>
      ))}
    </section>
  );
}

export default HomeContent;
