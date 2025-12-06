export async function getData() {
  //   const data = await fetch("https://api.vercel.app/blog");
  const data = await fetch("http://localhost:4000/songs");

  const posts = await data.json();
  return posts;
}
