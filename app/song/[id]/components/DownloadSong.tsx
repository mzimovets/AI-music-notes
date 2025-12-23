import DownloadIcon from "@/components/DownloadIcon";

export const DownloadSong = () => {
  return (
    <button
      className="hover:opacity-100 transition-opacity duration-300 group"
      title="Скачать"
    >
      <a
        href="/testnotes.pdf"
        download="filename.pdf"
        className="hover:opacity-100 transition-opacity duration-300 group"
        title="Скачать"
      >
        <DownloadIcon width={34} height={34} />
      </a>
    </button>
  );
};
