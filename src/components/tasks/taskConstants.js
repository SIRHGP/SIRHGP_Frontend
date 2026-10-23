import { Circle, CircleDot, CheckCircle, XCircle, AlertTriangle, AlertCircle, GitBranch, Flag } from 'lucide-react';

export const STATUTS = ['A_FAIRE', 'EN_COURS', 'EN_REVUE', 'TERMINEE', 'BLOQUEE'];
export const STATUT_CONFIG = {
  A_FAIRE: { label: 'À faire', variant: 'default', color: '#94A3B8', bg: '#F1F5F9', icon: Circle },
  EN_COURS: { label: 'En cours', variant: 'info', color: '#3B82F6', bg: '#EFF6FF', icon: CircleDot },
  EN_REVUE: { label: 'En revue', variant: 'warning', color: '#F59E0B', bg: '#FFFBEB', icon: GitBranch },
  TERMINEE: { label: 'Terminée', variant: 'success', color: '#10B981', bg: '#F0FDF4', icon: CheckCircle },
  BLOQUEE: { label: 'Bloquée', variant: 'danger', color: '#EF4444', bg: '#FFF5F5', icon: XCircle },
};

export const PRIORITES = ['BASSE', 'MOYENNE', 'HAUTE', 'URGENTE'];
export const PRIORITE_CONFIG = {
  BASSE: { label: 'Basse', color: '#10B981', bg: '#F0FDF4', icon: Flag },
  MOYENNE: { label: 'Moyenne', color: '#3B82F6', bg: '#EFF6FF', icon: Flag },
  HAUTE: { label: 'Haute', color: '#F59E0B', bg: '#FFFBEB', icon: AlertTriangle },
  URGENTE: { label: 'Urgente', color: '#EF4444', bg: '#FFF5F5', icon: AlertCircle },
};