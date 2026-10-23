import { Pencil, Calendar, Clock, CheckCircle, UserCheck, User, FolderOpen, Briefcase, Lock } from 'lucide-react';
import { Modal, Badge, Button, Avatar, SucursaleBadge } from '../ui';
import { STATUT_CONFIG, PRIORITE_CONFIG } from './taskConstants';

export default function TaskDetailModal({ task, open, onClose, onEdit }) {
  if (!task) return null;

  const statutCfg = STATUT_CONFIG[task.statut] || STATUT_CONFIG.A_FAIRE;
  const prioriteCfg = PRIORITE_CONFIG[task.priorite] || PRIORITE_CONFIG.MOYENNE;
  const StatutIcon = statutCfg.icon;
  const PrioriteIcon = prioriteCfg.icon;

  const assigneeName = task.assignee?.name || task.assigneeName || 'Non assigné';
  const createurName = task.createur?.name || task.createurName || 'Inconnu';

  const isExpired = task.dateEcheance && new Date(task.dateEcheance) < new Date() && task.statut !== 'TERMINEE' && task.statut !== 'BLOQUEE';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Détails de la tâche"
      width={700}
      footer={
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={onClose}>Fermer</Button>
          {onEdit && <Button onClick={() => { onClose(); onEdit(task); }}>
            <Pencil size={16} />
            Modifier
          </Button>}
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              {task.titre}
            </h2>
            <div style={{ display: 'flex', gap: 8 }}>
              <SucursaleBadge sucursalNom={task.sucursalNom} size="md" />
              <Badge variant={statutCfg.variant} size="md">
                <StatutIcon size={14} style={{ marginRight: 4 }} />
                {statutCfg.label}
              </Badge>
              <Badge 
                size="md" 
                style={{ 
                  background: prioriteCfg.bg, 
                  color: prioriteCfg.color,
                  border: `1px solid ${prioriteCfg.color}40`
                }}
              >
                <PrioriteIcon size={14} style={{ marginRight: 4 }} />
                {prioriteCfg.label}
              </Badge>
              {task.visibilite === 'PRIVEE' && (
                <Badge
                  size="md"
                  title="Tâche privée : visible uniquement par le créateur et l'assigné"
                  style={{ 
                    background: 'var(--bg-muted)', 
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-muted)'
                  }}
                >
                  <Lock size={14} style={{ marginRight: 4 }} />
                  Privée
                </Badge>
              )}
            </div>
          </div>
          
          {task.projet && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 14 }}>
              <FolderOpen size={16} />
              <span>{task.projet.nom}</span>
              {task.projet.codeProjet && (
                <span style={{ fontSize: 12, background: 'var(--bg-muted)', padding: '2px 8px', borderRadius: 'var(--radius-sm)' }}>
                  {task.projet.codeProjet}
                </span>
              )}
            </div>
          )}
        </div>

        {task.description && (
          <div>
            <h4 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>Description</h4>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {task.description}
            </p>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{ 
            padding: 16, 
            background: 'var(--bg-muted)', 
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-muted)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <UserCheck size={16} color="var(--text-muted)" />
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Assigné à</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Avatar name={assigneeName} size={40} />
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{assigneeName}</div>
                {task.assignee?.email && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{task.assignee.email}</div>
                )}
                {task.assignee?.posteName && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    <Briefcase size={11} style={{ display: 'inline', marginRight: 3 }} />
                    {task.assignee.posteName}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{ 
            padding: 16, 
            background: 'var(--bg-muted)', 
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-muted)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <User size={16} color="var(--text-muted)" />
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Créé par</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Avatar name={createurName} size={40} />
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{createurName}</div>
                {task.createur?.email && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{task.createur.email}</div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          {task.dateEcheance && (
            <div style={{ 
              padding: 12, 
              background: isExpired ? '#FEF2F2' : 'var(--bg-muted)', 
              borderRadius: 'var(--radius-md)',
              border: `1px solid ${isExpired ? '#FECACA' : 'var(--border-muted)'}`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Calendar size={14} color={isExpired ? 'var(--color-danger)' : 'var(--text-muted)'} />
                <span style={{ fontSize: 11, fontWeight: 600, color: isExpired ? 'var(--color-danger)' : 'var(--text-muted)' }}>
                  Échéance
                </span>
              </div>
              <div style={{ fontWeight: 500, color: isExpired ? 'var(--color-danger)' : 'var(--text-primary)' }}>
                {new Date(task.dateEcheance).toLocaleDateString('fr-FR', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
                {isExpired && <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 600 }}>⚠️ Dépassée</span>}
              </div>
            </div>
          )}

          {task.dateCreation && (
            <div style={{ padding: 12, background: 'var(--bg-muted)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-muted)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Clock size={14} color="var(--text-muted)" />
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>Créée le</span>
              </div>
              <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                {new Date(task.dateCreation).toLocaleDateString('fr-FR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
            </div>
          )}

          {task.statut === 'TERMINEE' && task.dateFin && (
            <div style={{ padding: 12, background: '#F0FDF4', borderRadius: 'var(--radius-md)', border: '1px solid #86EFAC' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <CheckCircle size={14} color="#10B981" />
                <span style={{ fontSize: 11, fontWeight: 600, color: '#10B981' }}>Terminée le</span>
              </div>
              <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                {new Date(task.dateFin).toLocaleDateString('fr-FR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 16, padding: 16, background: 'var(--bg-muted)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>
              {task.pourcentageCompletion || 0}%
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Progression</div>
          </div>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>
              {task.nombreCommentaires || 0}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Commentaires</div>
          </div>
          {task.joursRestants !== undefined && task.joursRestants !== null && (
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: task.joursRestants < 0 ? 'var(--color-danger)' : 'var(--text-primary)' }}>
                {task.joursRestants}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {task.joursRestants < 0 ? 'Jours en retard' : 'Jours restants'}
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}