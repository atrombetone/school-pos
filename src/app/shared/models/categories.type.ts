export const CATEGORY_OPTIONS = ['Doces', 'Salgados', 'Bebidas geladas', 'Refrigerantes', 'Outros'] as const;

export type CategoriesType = (typeof CATEGORY_OPTIONS)[number];

export const CATEGORY_SELECT_OPTIONS: ReadonlyArray<{ value: CategoriesType; label: CategoriesType }> =
	CATEGORY_OPTIONS.map(category => ({
		value: category,
		label: category,
	}));