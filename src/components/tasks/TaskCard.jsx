import { useState } from 'react';
import { Pencil, Trash2, Calendar, FolderOpen, GripVertical, Lock } from 'lucide-react';
import { Avatar, SucursaleBadge } from '../ui';
import { STATUTS, STATUT_CONFIG, PRIORITE_CONFIG } from './taskConstants';

export default function TaskCard({ task, onTaskClick, onEdit, onDelete, onChangeStatut, showStatutButtons = false, reactionActions = null, onDragStateChange, readOnly = false, hideDelete = false }) {
  const prioriteCfg = PRIORITE_CONFIG[task.priorite] || PRIORITE_CONFIG.MOYENNE;
  const PrioriteIcon = prioriteCfg.icon;
  
  const assigneeName = task.assignee?.name || task.assigneeName || 'Non assigné';
  const projetNom = task.projet?.nom || task.projetNom || 'Sans projet';
  const hasAssignee = task.assignee?.name || task.assigneeName;
  
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = (e) => {
    e.dataTransfer.setData('taskId', task.id);
    e.dataTransfer.effectAllowed = 'move';
    setIsDragging(true);
    // Signaler à la page qu'un drag est actif (pour estomper les autres colonnes)
    onDragStateChange?.(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    onDragStateChange?.(false);
  };

  const isExpired = task.dateEcheance && new Date(task.dateEcheance) < new Date() && task.statut !== 'TERMINEE' && task.statut !== 'BLOQUEE';

  const handleCardClick = (e) => {
    if (e.target.closest('.task-actions')) return;
    onTaskClick?.(task);
  };

  return (
    <div 
      draggable={!readOnly}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={handleCardClick}
      style={{
        background: 'var(--bg-surface)',
        borderRadius: 'var(--radius-md)',
        border: isDragging ? '2px dashed var(--color-primary)' : '1px solid var(--border-default)',
        padding: isDragging ? '13px 15px' : '14px 16px',
        transition: 'all var(--transition-fast)',
        cursor: isDragging ? 'grabbing' : 'grab',
        position: 'relative',
        boxShadow: 'var(--shadow-xs)',
        opacity: isDragging ? 0.4 : 1,
        transform: isDragging ? 'scale(0.97)' : 'scale(1)',
      }}
      onMouseEnter={e => {
        if (isDragging) return;
        e.currentTarget.style.boxShadow = 'var(--shadow-md)';
        e.currentTarget.style.borderColor = 'var(--color-primary)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = 'var(--shadow-xs)';
        e.currentTarget.style.borderColor = 'var(--border-default)';
      }}
    >
      {/* Poignée d'indication de déplaçabilité */}
      <div style={{
        position: 'absolute',
        right: 6,
        top: 6,
        color: 'var(--border-default)',
        pointerEvents: 'none',
      }}>
        <GripVertical size={13} />
      </div>

      <div style={{
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 3,
        background: prioriteCfg.color,
        borderTopLeftRadius: 'var(--radius-md)',
        borderBottomLeftRadius: 'var(--radius-md)',
      }} />

      <div style={{ marginLeft: 8 }}>
        {/* Priorité et projet sur une seule ligne */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, marginBottom: 8 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0,
            fontSize: 10, fontWeight: 700,
            padding: '3px 9px', borderRadius: 'var(--radius-full)',
            background: prioriteCfg.bg, color: prioriteCfg.color,
          }}>
            <PrioriteIcon size={11} />
            {prioriteCfg.label}
          </div>
          <SucursaleBadge sucursalNom={task.sucursalNom} />
          <div title={projetNom} style={{
            display: 'flex', alignItems: 'center', gap: 4, minWidth: 0,
            fontSize: 10, color: 'var(--text-muted)',
            padding: '3px 6px', background: 'var(--bg-muted)',
            borderRadius: 'var(--radius-full)',
          }}>
            <FolderOpen size={11} style={{ flexShrink: 0 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{projetNom}</span>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h4 style={{ 
              fontWeight: 600, 
              fontSize: 14, 
              color: 'var(--text-primary)',
              marginBottom: 4,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {task.titre}
            </h4>
            {task.description && (
              <p style={{ 
                fontSize: 12, 
                color: 'var(--text-muted)',
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 1,
                WebkitBoxOrient: 'vertical',
              }}>
                {task.description}
              </p>
            )}
          </div>

          {/* Étiquettes — design prototype */}
          {(task.etiquettes?.length > 0 || task.tags?.length > 0) && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
              {(task.etiquettes || task.tags || []).map(tag => (
                <span key={tag} style={{
                  padding: '2px 7px', borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-muted)', color: 'var(--text-secondary)',
                  fontSize: 10, fontWeight: 600,
                }}>
                  {tag}
                </span>
              ))}
            </div>
          )}

          {!readOnly && <div className="task-actions" style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <button 
              onClick={(e) => { e.stopPropagation(); onEdit(task); }} 
              style={{ 
                border: 'none', 
                background: 'none', 
                cursor: 'pointer', 
                color: 'var(--text-muted)', 
                padding: 4,
                borderRadius: 'var(--radius-sm)',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <Pencil size={14} />
            </button>
            {!hideDelete && <button 
              onClick={(e) => { e.stopPropagation(); onDelete(task); }} 
              style={{ 
                border: 'none', 
                background: 'none', 
                cursor: 'pointer', 
                color: 'var(--color-danger)', 
                padding: 4,
                borderRadius: 'var(--radius-sm)',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#FEF2F2'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <Trash2 size={14} />
            </button>}
          </div>}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, minWidth: 0 }}>
            <div title="Date d’échéance" style={{
              display: 'flex', alignItems: 'center', gap: 4, minWidth: 0,
              color: isExpired ? 'var(--color-danger)' : 'var(--text-muted)',
            }}>
              <Calendar size={12} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 11, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {task.dateEcheance
                  ? new Date(task.dateEcheance).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
                  : 'Sans échéance'}
              </span>
            </div>
            <div title={task.visibilite === 'PRIVEE'
              ? "Visible uniquement par le créateur et l'assigné"
              : "Visible par tous les utilisateurs de l'entreprise"} style={{
              display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0,
              fontSize: 10, fontWeight: 700, padding: '3px 9px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--bg-muted)', color: 'var(--text-secondary)',
            }}>
              {task.visibilite === 'PRIVEE' && <Lock size={11} />}
              {task.visibilite === 'PRIVEE' ? 'Privée' : 'Publique'}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {hasAssignee && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                <Avatar name={assigneeName} size={20} />
                <span style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {assigneeName.split(' ')[0]}
                </span>
              </div>
            )}


          </div>

          {(() => {
            const visibleStatuts = readOnly ? [] : Array.isArray(reactionActions)
              ? reactionActions
              : (showStatutButtons ? STATUTS.filter(s => s !== task.statut) : []);
            if (visibleStatuts.length === 0) return null;
            return (
              <div style={{
                marginTop: 4,
                display: 'flex',
                gap: 4,
                flexWrap: 'wrap',
                paddingTop: 8,
                borderTop: '1px solid var(--border-muted)',
              }}>
                {visibleStatuts.map(s => {
                  const Icon = STATUT_CONFIG[s].icon;
                  return (
                    <button
                      key={s}
                      onClick={(e) => { e.stopPropagation(); onChangeStatut(task, s); }}
                      style={{
                        fontSize: 9,
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-full)',
                        border: `1px solid ${STATUT_CONFIG[s].color}40`,
                        background: STATUT_CONFIG[s].bg,
                        color: STATUT_CONFIG[s].color,
                        cursor: 'pointer',
                        fontWeight: 500,
                        transition: 'all var(--transition-fast)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 3,
                      }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      <Icon size={8} />
                      {STATUT_CONFIG[s].label}
                    </button>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
