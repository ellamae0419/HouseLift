import './style.css';

export const Container = ({
  children,
  className = '',
  minItemWidth = '260px',
  gap = '1rem',
}) => {
  return (
    <section
      className={`responsive-container ${className}`.trim()}
      style={{
        '--container-min-width': minItemWidth,
        '--container-gap': gap,
      }}
    >
      {children}
    </section>
  );
};

export default Container;
