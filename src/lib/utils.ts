import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getPageNumbers(
  currentPage: number,
  totalPages: number,
  siblingCount: number = 1,
): Array<number | "..."> {
  const clamp = (n: number, min: number, max: number) =>
    Math.max(min, Math.min(max, n));

  if (totalPages <= 1) return [1];

  const totalNumbers = siblingCount * 2 + 5;
  if (totalPages <= totalNumbers) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const leftSibling = clamp(currentPage - siblingCount, 1, totalPages);
  const rightSibling = clamp(currentPage + siblingCount, 1, totalPages);

  const showLeftEllipsis = leftSibling > 2;
  const showRightEllipsis = rightSibling < totalPages - 1;

  const pages: Array<number | "..."> = [1];

  if (showLeftEllipsis) pages.push("...");

  const start = showLeftEllipsis ? leftSibling : 2;
  const end = showRightEllipsis ? rightSibling : totalPages - 1;

  for (let p = start; p <= end; p++) pages.push(p);

  if (showRightEllipsis) pages.push("...");

  pages.push(totalPages);

  return pages;
}
