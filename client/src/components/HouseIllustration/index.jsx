const LABELS = {
    safe: 'Safe: platform resting on ground',
    caution: 'Caution: water is rising, platform raised',
    danger: 'Danger: critical flood level, platform raised',
};

export const HouseIllustration = ({ flooded, level }) => {
    const label = LABELS[level] || (flooded ? 'Flood detected — platform raised' : 'All clear — platform resting on ground');
    return (
        <div className="house-illustration" role="img" aria-label={label}>
            <img
                src="/pet-house-icon.png"
                alt=""
                className="house-illustration__img"
                style={{ transform: flooded ? 'translateY(-14px)' : 'translateY(0)' }}
            />
            <div className={`house-illustration__water${flooded ? ' is-flooded' : ''}${level ? ` is-${level}` : ''}`} />
        </div>
    );
};

export default HouseIllustration;
