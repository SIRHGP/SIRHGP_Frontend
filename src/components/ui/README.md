# SIRHGP — Bibliothèque UI

Bibliothèque centralisée de composants React **standards, modernes et réutilisables** de la plateforme SIRHGP.

> **Import unique** depuis n'importe quelle page :
> ```jsx
> import { Button, Input, Select, Card, Table, Modal, Badge } from 'components/ui';
> ```
> (chemin relatif selon la page : `../components/ui` ou `../../components/ui`)

Modifier un composant central ici met automatiquement à jour **toute la plateforme** — plus de styles dupliqués par page.

---

## 📦 Composants disponibles

### Actions — `Button.jsx`
| Variantes | `primary` | `secondary` | `danger` | `ghost` | `outline` | `success` |
|---|---|---|---|---|---|---|
| Tailles | `sm` | `md` | `lg` | | | |

Props : `loading`, `leftIcon`, `rightIcon`, `disabled`, `onClick`, `type`, `className`, `style`.

```tsx
<Button variant="primary" onClick={save}>Enregistrer</Button>
<Button variant="secondary">Annuler</Button>
<Button variant="danger" loading={del}>Supprimer</Button>
<Button variant="outline" leftIcon={<Pencil size={16}/>}>Modifier</Button>
```

---

## Champs de formulaire — `fields.jsx`

| Composant | Rôle |
|---|---|
| `Input` | Champ texte avec icônes, label, erreur |
| `Textarea` | Zone de texte redimensionnable |
| `Select` | Menu déroulant (options primitives **ou** `{value,label}`) |
| `SearchInput` | Champ de recherche avec loupe intégrée |
| `Checkbox` | Case à cocher |
| `Switch` | Toggle binaire |
| `RadioGroup` | Groupe d'options radio |

Props communes : `label`, `error`, `required`, `disabled`.

```tsx
<Input label="Email" type="email" error={err} value={v} onChange={e=>setV(e.target.value)} />
<Select label="Rôle" options={roles.map(r=>({value:r.id,label:r.name}))} value={x} onChange={e=>setX(e.target.value)} />
<Switch checked={actif} onChange={setActif} label="Actif" />
```

---

## Contenants & affichage

### `Card.jsx`
`Card`, `StatsGrid`, `StatCard`
```tsx
<Card hover style={{ padding: 16 }}>contenu</Card>
<StatsGrid cols={4}>
  <StatCard title="Employés" value={42} icon={<Users/>} color="#2563EB" trend={8.2} />
</StatsGrid>
```

### `Badge.jsx`
Variantes : `default` · `primary` · `accent` · `success` · `warning` · `danger` · `info`
```tsx
<Badge variant="success" dot>Actif</Badge>
```

### `Avatar.jsx` / `AvatarGroup.jsx`
```tsx
<Avatar name="Jean Dupont" size={36} />
<AvatarGroup names={['A. Benali','L. Moreau']} max={3} />
```

### `IconBox.jsx`
Tuile d'icône standardisée (**36×36**, `radius-md`) avec fond clair dérivé automatiquement de la couleur de l'icône.
```tsx
<IconBox icon={<Building2 size={16}/>} color="var(--color-primary)" />
<IconBox icon={<Zap size={20}/>} color="#F59E0B" size={40} />          // hex → fond alpha
<IconBox icon={<Activity size={22}/>} color="var(--color-info)" radius="var(--radius-lg)" />
```
| Prop | Rôle |
|---|---|
| `icon` | Composant icône lucide |
| `color` | Couleur de l'icône → définit aussi le fond (mapping auto vers `*-light`, ou alpha 10% pour les hex) |
| `size` | Taille en px (défaut 36) |
| `bg` / `radius` / `style` | Surcharges optionnelles |

> **Règle projet** : ne plus jamais écrire de tuile d'icône inline (`width/height/display:flex/background`). Toujours utiliser `<IconBox>` — le fond suit automatiquement la couleur dans les thèmes clair et sombre.

### `Table.jsx` — `Table`, `Pagination`
```tsx
const columns = [
  { key:'name', label:'Nom' },
  { key:'statut', label:'Statut', render:(v)=> <Badge>…</Badge> },
];
<Table columns={columns} data={rows} loading={loading} onRowClick={r=>…} />
<Pagination page={page} totalPages={tp} onChange={setPage} />
```

---

## Rétroaction — `Feedback.jsx`
`Spinner` · `Skeleton` · `Empty` · `Alert` · `LoadingPage` · `Progress`

```tsx
<Alert variant="warning" title="Attention" onClose={dismiss}>message</Alert>
<Progress value={65} color="#10B981" showLabel />
{loading && <Spinner size={28}/>}
```

---

## Fenêtres & dialogue — `Modal.jsx`
`Modal` · `Confirm` · `Drawer`
```tsx
<Modal open={open} onClose={close} title="Nouveau" footer={<Button onClick={save}>Créer</Button>}>
  formulaire
</Modal>
<Confirm open={!!del} onClose={clear} onConfirm={del} title="Supprimer" message="…" confirmLabel="Supprimer" />
<Drawer open={open} onClose={close} title="Détails" width={420}>contenu</Drawer>
```

---

## Navigation & structure
`Tabs` · `FormRow` · `Divider` · `PageHeader` · `Breadcrumbs` · `Dropdown`
```tsx
<PageHeader title="Employés" subtitle="Gestion RH" breadcrumbs={['RH','Employés']}>
  <Button>Nouvel employé</Button>
</PageHeader>
<Tabs tabs={[{key:'a',label:'Tab A'},{key:'b',label:'Tab B',count:3}]} active={tab} onChange={setTab} />
<Dropdown label="Actions" items={[{label:'Éditer',onClick:…},{divider:true},{label:'Supprimer',danger:true,onClick:…}]} />
<FormRow cols={2}>…</FormRow>
```

---

## 🎨 Design system commun
Tout repose sur les **variables CSS** de `src/index.css` :
`--color-primary/accent/success/warning/danger/info`, `--radius-*`, `--shadow-*`, `--bg-surface`, thème clair/sombre (`[data-theme="dark"]`).
Modifier ces tokens re-stylise toute la plateforme en un seul endroit.