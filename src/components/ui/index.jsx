/**
 * ============================================================
 *  SIRHGP — Bibliothèque UI centralisée
 * ============================================================
 *  Point d'entrée unique de tous les composants standards.
 *
 *  import { Button, Card, Modal, Table } from 'components/ui'
 *
 *  Consulter le README.md du dossier pour la documentation
 *  complète (rôle, variantes, props, exemples).
 * ============================================================
 */

// Actions & champs de formulaire
export { Button } from './Button';
export { Input, Textarea, Select, SearchInput, Checkbox, Switch, RadioGroup } from './fields';

// Contenants & données
export { Card, StatsGrid, StatCard } from './Card';
export { Table, Pagination } from './Table';
export { Badge } from './Badge';
export { SucursaleBadge } from './SucursaleBadge';
export { SucursaleField } from './SucursaleField';
export { Avatar, AvatarGroup } from './Avatar';

// Rétroaction
export { Spinner, Skeleton, Empty, Alert, LoadingPage, Progress } from './Feedback';

// Fenêtres & dialogue
export { Modal, Confirm, Drawer } from './Modal';

// Navigation & structure
export { Tabs, FormRow, Divider } from './Tabs';
export { Flex, SectionTitle, InfoRow, KeyText } from './Layout';
export { PageHeader, Breadcrumbs } from './PageHeader';
export { Dropdown } from './Dropdown';

// Icônes
export { IconBox } from './IconBox';