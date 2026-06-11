import { formatCatalogGenre } from '../mappers/catalog.mapper.js';
import {
  findCatalogGenreRecords,
  findCatalogTagTypesRecord,
} from '../repositories/catalog.repository.js';

const GENRE_TYPE_ALIASES = new Set(['genre', 'genres']);

const normalizeTagTypeName = (value) =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/[-\s]+/g, '_');

const isGenreTagType = (tagType) => GENRE_TYPE_ALIASES.has(normalizeTagTypeName(tagType.name));

export const listCatalogGenres = async () => {
  const tagTypes = await findCatalogTagTypesRecord();
  const genreTypeIds = tagTypes.filter(isGenreTagType).map((tagType) => tagType.id);

  if (genreTypeIds.length === 0) {
    return [];
  }

  const genres = await findCatalogGenreRecords({ typeIds: genreTypeIds });

  return genres.map(formatCatalogGenre).sort((left, right) => {
    const countDiff = right.games_count - left.games_count;

    if (countDiff !== 0) {
      return countDiff;
    }

    return left.name.localeCompare(right.name);
  });
};
