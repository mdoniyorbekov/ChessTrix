import "./menu.css";

type ModeCardProps = {
  title: string;
  description: string;
  imageSrc: string;
  onClick: () => void;
};

export function ModeCard({ title, description, imageSrc, onClick }: ModeCardProps) {
  return (
    <button className="mode-card" type="button" aria-label={`Open ${title}`} onClick={onClick}>
      <span className="mode-card__frame">
        <img className="mode-card__image" src={imageSrc} alt={`${title} menu icon`} draggable={false} />
        <span className="mode-card__shine" aria-hidden="true" />
      </span>
      <span className="mode-card__label">
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
    </button>
  );
}
