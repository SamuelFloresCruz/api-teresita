type AdminPageHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
  action?: string;
  onAction?: () => void;
};

export function AdminPageHeader({ eyebrow, title, description, action, onAction }: AdminPageHeaderProps) {
  return (
    <div className="admin-page-header">
      <div>
        <p>{eyebrow}</p>
        <h1>{title}</h1>
        <span>{description}</span>
      </div>
      {action && <button type="button" onClick={onAction}>＋ {action}</button>}
    </div>
  );
}
