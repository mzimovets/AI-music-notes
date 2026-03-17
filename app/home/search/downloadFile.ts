export const downloadFile = (song) => {
  if (!song.file?.filename) {
    console.error("Файл не найден");
    return;
  }

  const fileUrl = `/scores/${song.file.filename}`;

  const link = document.createElement("a");
  link.href = fileUrl;
  link.download = song.file.filename || `песня_${song.name}.pdf`;
  link.target = "_blank";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
