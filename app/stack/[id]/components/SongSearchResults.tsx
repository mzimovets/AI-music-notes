import React from "react";
import { Card, Input, Pagination, Button } from "@mui/material";

interface SongSearchResultsProps {
  filteredSongs: any[];
  searchValue: string;
  onAddSong: (song: any) => void;
  onPreview: (song: any) => void;
  programSelected: any;
  rowsPerPage?: number;
  page: number;
  setPage: (page: number) => void;
}

const SongSearchResults: React.FC<SongSearchResultsProps> = ({
  filteredSongs,
  searchValue,
  onAddSong,
  onPreview,
  programSelected,
  rowsPerPage = 4,
  page,
  setPage,
}) => {
  const handlePageChange = (
    event: React.ChangeEvent<unknown>,
    value: number,
  ) => {
    setPage(value);
  };

  return (
    <div className="search-container">
      <Input
        className="search-input"
        placeholder="Search songs"
        value={searchValue}
        // onChange handler should be managed by parent component
      />
      <div className="search-results">
        {filteredSongs
          .slice((page - 1) * rowsPerPage, page * rowsPerPage)
          .map((song) => (
            <Card key={song.id} className="song-card">
              <div className="song-info">{song.title}</div>
              <div className="song-actions">
                <Button onClick={() => onAddSong(song)}>+</Button>
                <Button onClick={() => onPreview(song)}>R</Button>
              </div>
            </Card>
          ))}
      </div>
      <Pagination
        count={Math.ceil(filteredSongs.length / rowsPerPage)}
        page={page}
        onChange={handlePageChange}
        className="pagination"
      />
    </div>
  );
};

export default SongSearchResults;
