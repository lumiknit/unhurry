import { Component, createSignal, Show } from 'solid-js';
import { toast } from 'solid-toast';

import { openConfirm } from '@/components/modal';
import { getUserConfig, setUserConfig } from '@/state/config';

import {
	defaultProviderConfig,
	providerKindLabel,
	ProviderConfig,
	ProviderKind,
} from '@lib/config';

import ItemList from './ItemList';
import ProviderItem from './ProviderItem';

const sortByName = (arr: ProviderConfig[]) =>
	[...arr].sort((a, b) => a.name.localeCompare(b.name));

const ProviderList: Component = () => {
	const [selectedId, setSelectedId] = createSignal('');

	const providers = () => sortByName(getUserConfig()?.providers || []);

	const editingIdx = () => {
		const idx = providers().findIndex((p) => p.id === selectedId());
		return idx >= 0 ? idx : 0;
	};

	const addProvider = (kind: ProviderKind) => {
		const existing = (getUserConfig()?.providers || []).filter(
			(p) => p.kind === kind
		);
		const base = providerKindLabel(kind);
		const name =
			existing.length === 0 ? base : `${base} (${existing.length + 1})`;
		const newProvider = { ...defaultProviderConfig(kind), name };
		setUserConfig((c) => ({
			...c,
			providers: sortByName([...(c.providers || []), newProvider]),
		}));
		setSelectedId(newProvider.id);
		toast.success(`Provider ${name} added`);
	};

	const updateProvider = (id: string) => (p: ProviderConfig) => {
		setUserConfig((c) => ({
			...c,
			providers: sortByName(
				c.providers.map((existing) =>
					existing.id === id ? p : existing
				)
			),
		}));
	};

	const deleteProvider = async (id: string) => {
		const provider = providers().find((p) => p.id === id);
		if (!provider) return;
		if (!(await openConfirm(`Delete provider "${provider.name}"?`))) return;
		setUserConfig((c) => ({
			...c,
			providers: c.providers.filter((p) => p.id !== id),
		}));
		toast.success(`Provider deleted`);
	};

	return (
		<div>
			<h2 class="title is-4">Providers ({providers().length})</h2>

			<p>Add a provider to use its models.</p>

			<div class="mb-2" />

			<ItemList
				items={providers().map((p) => ({
					label: p.name,
					color: 'primary',
				}))}
				selected={editingIdx()}
				onSelect={(idx) => setSelectedId(providers()[idx]?.id || '')}
				onAdd={() => addProvider('openai')}
			/>

			<Show when={providers()[editingIdx()]}>
				<ProviderItem
					provider={providers()[editingIdx()]}
					idx={editingIdx()}
					onUpdate={updateProvider(providers()[editingIdx()].id)}
					onDelete={() =>
						deleteProvider(providers()[editingIdx()].id)
					}
				/>
			</Show>
		</div>
	);
};

export default ProviderList;
