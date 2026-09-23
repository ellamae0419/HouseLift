export const HouseIllustration = ({ flooded }) => {
    return (
        <div className="house-illustration" role="img" aria-label={flooded ? 'Flood detected — platform raised' : 'All clear — platform resting on ground'}>
            <img
                src="/pet-house-icon.png"
                alt=""
                className="house-illustration__img"
                style={{ transform: flooded ? 'translateY(-14px)' : 'translateY(0)' }}
            />
            <div className={`house-illustration__water${flooded ? ' is-flooded' : ''}`} />
        </div>
    );
};

export default HouseIllustration;
