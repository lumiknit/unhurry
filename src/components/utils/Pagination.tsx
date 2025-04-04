import { BiRegularLeftArrowAlt, BiRegularRightArrowAlt } from 'solid-icons/bi';
import {
	Accessor,
	Component,
	createEffect,
	createSignal,
	For,
	Match,
	Switch,
} from 'solid-js';

export type PaginatedList<T> = {
	totalPages: number;
	page: number;
	items: T[];
	lastList: T[] | undefined;
};

/**
 * Create a paginated list signal.
 */
export function createPaginatedList<T>(
	fullList: Accessor<T[]>,
	pageSize: number
): [
	Accessor<PaginatedList<T>>,
	(page: number) => void, // Page setter
] {
	const [items, setItems] = createSignal<PaginatedList<T>>({
		totalPages: 0,
		page: 1,
		items: [],
		lastList: undefined,
	});

	createEffect(() => {
		pageSetter(items().page);
	});

	const pageSetter = (page: number) => {
		const lst = fullList();
		const start = (page - 1) * pageSize;
		const end = Math.min(start + pageSize, lst.length);
		setItems((old) => {
			if (old.lastList === lst && old.page === page) {
				return old;
			}
			return {
				totalPages: Math.ceil(lst.length / pageSize),
				page: page,
				items: lst.slice(start, end),
				lastList: lst,
			};
		});
	};

	return [items, pageSetter];
}

type Props = {
	currentPage: number;
	totalPages: number;
	onPageChange: (page: number) => void;
};

const PageButton: Component<{
	page: number;
	currentPage?: number;
	onPageChange: (page: number) => void;
}> = (props) => {
	return (
		<li>
			<a
				href="#"
				class={
					'pagination-link' +
					(props.currentPage === props.page ? ' is-current' : '')
				}
				aria-label={`Goto page ${props.page}`}
				onClick={() => props.onPageChange(props.page)}
			>
				{props.page}
			</a>
		</li>
	);
};

/**
 * Pagination component.
 * It will a full-width pagination bar.
 */
const Pagination: Component<Props> = (props) => {
	/**
	 * Return which button to show.
	 * number is the page number,
	 * null is the ellipsis
	 */
	const items = (): (number | null)[] => {
		if (props.totalPages <= 7) {
			return Array.from({ length: props.totalPages }, (_, i) => i + 1);
		} else if (props.currentPage <= 3) {
			return [1, 2, 3, 4, 5, null, props.totalPages];
		} else if (props.currentPage >= props.totalPages - 2) {
			return [
				1,
				null,
				props.totalPages - 4,
				props.totalPages - 3,
				props.totalPages - 2,
				props.totalPages - 1,
				props.totalPages,
			];
		} else {
			return [
				1,
				null,
				props.currentPage - 1,
				props.currentPage,
				props.currentPage + 1,
				null,
				props.totalPages,
			];
		}
	};
	return (
		<nav
			class="pagination is-centered"
			role="navigation"
			aria-label="pagination"
		>
			<a
				href="#"
				class={
					'pagination-previous' +
					(props.currentPage <= 1 ? ' is-disabled' : '')
				}
				onClick={() => props.onPageChange(props.currentPage - 1)}
			>
				<BiRegularLeftArrowAlt />
			</a>
			<ul class="pagination-list">
				<For each={items()}>
					{(item) => (
						<Switch>
							<Match when={item === null}>
								<li>
									<span class="pagination-ellipsis">
										&hellip;
									</span>
								</li>
							</Match>
							<Match when>
								<li>
									<PageButton
										page={item as number}
										currentPage={props.currentPage}
										onPageChange={props.onPageChange}
									/>
								</li>
							</Match>
						</Switch>
					)}
				</For>
			</ul>
			<a
				href="#"
				class={
					'pagination-next' +
					(props.currentPage >= props.totalPages
						? ' is-disabled'
						: '')
				}
				onClick={() => props.onPageChange(props.currentPage + 1)}
			>
				<BiRegularRightArrowAlt />
			</a>
		</nav>
	);
};

export default Pagination;
