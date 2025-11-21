import type { SupabaseClient } from '../../../db/supabase.client';
import type { SetsListQuery, SetSummaryDTO, PaginationMeta } from '../../../types';

/**
 * Service function to retrieve a paginated list of sets for a given user.
 * 
 * Implements:
 * - Filtering by name prefix (search) using idx_sets_name_prefix index
 * - Filtering by CEFR level
 * - Cursor-based pagination
 * - Sorting by created_at (desc) or name (asc)
 * 
 * @param supabase - Authenticated Supabase client
 * @param userId - Current user ID from auth token
 * @param query - Query parameters (search, level, cursor, limit, sort)
 * @returns Paginated response with sets data and pagination metadata
 */
export async function listSets(
  supabase: SupabaseClient,
  userId: string,
  query: SetsListQuery
): Promise<{ data: SetSummaryDTO[]; pagination: PaginationMeta }> {
  const { search, level, cursor, limit = 10, sort = 'created_at_desc' } = query;

  // Start building the query - select only required columns
  let queryBuilder = supabase
    .from('sets')
    .select('id, name, level, words_count, created_at')
    .eq('user_id', userId);

  // Apply name prefix filter if provided
  if (search) {
    queryBuilder = queryBuilder.ilike('name', `${search}%`);
  }

  // Apply CEFR level filter if provided
  if (level) {
    queryBuilder = queryBuilder.eq('level', level);
  }

  // Apply sorting
  if (sort === 'created_at_desc') {
    queryBuilder = queryBuilder.order('created_at', { ascending: false }).order('id', { ascending: false });
  } else {
    queryBuilder = queryBuilder.order('name', { ascending: true }).order('id', { ascending: true });
  }

  // Apply cursor-based pagination if cursor is provided
  if (cursor) {
    const [timestampOrName, uuid] = cursor.split('|');
    
    if (!uuid) {
      throw new Error('Invalid cursor format. Expected format: timestamp|uuid or name|uuid');
    }

    if (sort === 'created_at_desc') {
      // For created_at_desc, we need records created before the cursor
      queryBuilder = queryBuilder.or(`created_at.lt.${timestampOrName},and(created_at.eq.${timestampOrName},id.lt.${uuid})`);
    } else {
      // For name_asc, we need records alphabetically after the cursor
      queryBuilder = queryBuilder.or(`name.gt.${timestampOrName},and(name.eq.${timestampOrName},id.gt.${uuid})`);
    }
  }

  // Apply limit (fetch limit + 1 to determine if there's a next page)
  queryBuilder = queryBuilder.limit(limit + 1);

  // Execute query
  const { data, error } = await queryBuilder;

  if (error) {
    throw new Error(`Failed to fetch sets: ${error.message}`);
  }

  // Determine if there's a next page
  const hasMore = data.length > limit;
  const results = hasMore ? data.slice(0, limit) : data;

  // Generate next cursor if there are more results
  let nextCursor: string | null = null;
  if (hasMore && results.length > 0) {
    const lastItem = results[results.length - 1];
    if (sort === 'created_at_desc') {
      nextCursor = `${lastItem.created_at}|${lastItem.id}`;
    } else {
      nextCursor = `${lastItem.name}|${lastItem.id}`;
    }
  }

  return {
    data: results,
    pagination: {
      next_cursor: nextCursor,
      count: results.length,
    },
  };
}

