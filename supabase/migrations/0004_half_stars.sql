-- Half-star ratings: 0, 0.5, 1 … 5. Safe to run more than once.

alter table public.books drop constraint if exists books_rating_check;
alter table public.books alter column rating type numeric(2,1) using rating::numeric(2,1);
alter table public.books add constraint books_rating_check
  check (rating between 0 and 5 and rating * 2 = floor(rating * 2));
