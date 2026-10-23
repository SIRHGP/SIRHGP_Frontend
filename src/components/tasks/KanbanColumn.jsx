import { useState } from 'react';
import { SquarePlus, MoveRight } from 'lucide-react';
import TaskCard from './TaskCard';
import { STATUT_CONFIG } from './taskConstants';

export default function KanbanColumn({ statut, tasks, onTaskClick, onEdit, onDelete, onChangeStatut, onDragOver, onDrop, onDragLeaveColumn, reactionActionsFor, dragActive = false, onDragStateChange, readOnly = false, hideDelete = false }) {
  const cfg = STATUT_CONFIG[statut];
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!isDragOver) setIsDragOver(true);
    onDragOver?.(statut);
  };

  const handleDragLeave = (e) => {
    // Éviter le clignotement : ne désactiver que si on quitte réellement la colonne
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragOver(false);
      onDragLeaveColumn?.(statut);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    onDragLeaveColumn?.(statut);
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId) onDrop?.(taskId, statut);
  };

  return (
    <div 
      style={{ 
        flex: '1 1 280px', 
        minWidth: 280, 
        maxWidth: 350,
        background: isDragOver ? cfg.color + '1A' : cfg.color + '0A',
        borderRadius: 16,
        borderTop: `4px solid ${cfg.color}`,
        borderLeft: `1px ${isDragOver ? 'dashed' : 'solid'} ${isDragOver ? cfg.color : 'var(--border-default)'}`,
        borderRight: `1px ${isDragOver ? 'dashed' : 'solid'} ${isDragOver ? cfg.color : 'var(--border-default)'}`,
        borderBottom: `1px ${isDragOver ? 'dashed' : 'solid'} ${isDragOver ? cfg.color : 'var(--border-default)'}`,
        boxShadow: isDragOver ? `0 0 0 3px ${cfg.color}22` : 'none',
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 400,
        maxHeight: 'calc(100vh - 280px)',
        overflow: 'hidden',
        transition: 'background var(--transition-fast), box-shadow var(--transition-fast), border-color var(--transition-fast)',
        opacity: dragActive && !isDragOver ? 0.65 : 1,
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div style={{ 
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 12, padding: '0 4px', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{cfg.label}</span>
          <span style={{
            padding: '2px 8px', borderRadius: 'var(--radius-full)',
            background: 'var(--bg-muted)', fontSize: 12, fontWeight: 700,
            color: 'var(--text-muted)',
          }}>{tasks.length}</span>
        </div>
        <button
          onClick={(e) => { e.preventDefault(); }}
          style={{
            padding: 4, borderRadius: 8, border: 'none',
            background: 'transparent', color: 'var(--text-muted)',
            cursor: 'pointer', display: 'flex',
            transition: 'background var(--transition-fast)',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <SquarePlus size={16} />
        </button>
      </div>

      <div style={{ 
        padding: '12px',
        overflowY: 'auto',
        flex: 1,
        minHeight: 200,
        position: 'relative',
      }}>
        {isDragOver && (
          <div style={{
            position: 'sticky',
            top: 0,
            zIndex: 2,
            marginBottom: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: '7px 10px',
            borderRadius: 'var(--radius-md)',
            background: cfg.color,
            color: '#fff',
            fontSize: 11,
            fontWeight: 700,
            boxShadow: `0 4px 12px ${cfg.color}55`,
            pointerEvents: 'none',
          }}>
            <MoveRight size={13} />
            Déposer ici
          </div>
        )}
        {tasks.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: isDragOver ? '40px 16px' : '32px 16px',
            color: isDragOver ? cfg.color : 'var(--text-muted)',
            fontSize: 12,
            fontWeight: isDragOver ? 600 : 400,
            border: `2px dashed ${isDragOver ? cfg.color : 'var(--border-default)'}`,
            borderRadius: 'var(--radius-md)',
            background: isDragOver ? cfg.color + '0D' : 'transparent',
            transition: 'all var(--transition-fast)',
          }}>
            {isDragOver ? 'Glissez la tâche ici' : 'Aucune tâche'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {tasks.map(task => (
              <TaskCard 
                key={task.id} 
                task={task} 
                onTaskClick={onTaskClick}
                onEdit={onEdit} 
                onDelete={onDelete}
                hideDelete={hideDelete}
                onChangeStatut={onChangeStatut}
                showStatutButtons={!readOnly}
                readOnly={typeof readOnly === "function" ? readOnly(task) : readOnly}
                reactionActions={reactionActionsFor ? reactionActionsFor(task) : null}
                onDragStateChange={onDragStateChange}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
