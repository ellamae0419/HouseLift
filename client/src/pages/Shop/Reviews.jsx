import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axios from '../../lib/axios';
import { setTitle } from '../../utils/generalFunctions';
import { ShopShell } from '../../components/ShopShell/index';
import shellStyles from '../../components/ShopShell/shell.module.css';
import formStyles from './style.module.css';
import styles from './reviews.module.css';

const fullNameRegex = /^[A-Za-zÀ-ÿ' -]{2,60}$/;
const COMMENT_MAX = 500;

const StarShape = ({ on }) => (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={on ? styles.starOn : styles.starOff}>
        <path d="m12 2.8 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.6l-5.8 3.1 1.1-6.5-4.7-4.6 6.5-.9L12 2.8Z" />
    </svg>
);

// Five stars, filled up to the rating (rounded to the nearest whole star).
export const Stars = ({ value }) => (
    <span className={styles.stars} role="img" aria-label={`${value} out of 5 stars`}>
        {[1, 2, 3, 4, 5].map((n) => <StarShape key={n} on={n <= Math.round(value)} />)}
    </span>
);

const monthYear = (value) => (value ? new Date(value).toLocaleDateString('en-PH', { month: 'long', year: 'numeric' }) : '');

// "What our customers say" on the home page: approved reviews only, plus a way to write one.
export const ReviewsSection = () => {
    const [data, setData] = useState({ count: 0, average: null, reviews: [] });

    useEffect(() => {
        axios.get('/shop/reviews')
            .then((res) => setData(res.data))
            .catch(() => { /* the home page works fine without reviews */ });
    }, []);

    return (
        <section className={styles.section} aria-label="Customer reviews">
            <div className={styles.wrap}>
                <div className={styles.head}>
                    <div>
                        <span className={styles.eyebrow}>Reviews</span>
                        <h2>What our customers say</h2>
                        {data.count > 0 && (
                            <p className={styles.summary}>
                                <Stars value={data.average} />
                                <b>{data.average.toFixed(1)}</b> out of 5, from {data.count} {data.count === 1 ? 'review' : 'reviews'}
                            </p>
                        )}
                    </div>
                    <Link to="/review" className={`${shellStyles.btn} ${shellStyles.btnOutline}`}>Write a review</Link>
                </div>

                {data.reviews.length > 0 ? (
                    <ul className={styles.list}>
                        {data.reviews.map((r) => (
                            <li key={r.id} className={styles.card}>
                                <Stars value={r.rating} />
                                {r.comment && <p className={styles.comment}>{r.comment}</p>}
                                <p className={styles.who}>
                                    <b>{r.name}</b>
                                    <span>{[r.sizeLabel && `${r.sizeLabel} size`, monthYear(r.createdAt)].filter(Boolean).join(' · ')}</span>
                                </p>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className={styles.empty}>No reviews yet. Bought a HydroLift? Be the first to tell others how it works for you.</p>
                )}
            </div>
        </section>
    );
};

// The page where a buyer writes a review. The serial code they were given when they bought proves it,
// and each code can review once. The review shows on the shop after the owner approves it.
export const WriteReview = () => {
    setTitle('Write a review');
    const [searchParams] = useSearchParams();
    const [serialCode, setSerialCode] = useState(() => (searchParams.get('code') || '').toUpperCase());
    const [name, setName] = useState('');
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [website, setWebsite] = useState('');   // a hidden box real visitors never fill; bots do
    const [errMsg, setErrMsg] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [sent, setSent] = useState(false);
    const errRef = useRef();

    useEffect(() => { setErrMsg(''); }, [serialCode, name, rating, comment]);

    const validName = !name.trim() || fullNameRegex.test(name.trim());
    const validComment = comment.length <= COMMENT_MAX;
    const canSubmit = serialCode.trim().length > 0 && rating >= 1 && validName && validComment && !submitting;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!canSubmit) return;
        setSubmitting(true);
        try {
            await axios.post('/shop/reviews', { serialCode: serialCode.trim(), name: name.trim(), rating, comment: comment.trim(), website });
            setSent(true);
        } catch (err) {
            if (!err?.response) setErrMsg('No server response. Check your connection and try again.');
            else setErrMsg(err.response?.data?.message || 'We could not send your review.');
            errRef.current?.focus();
        } finally {
            setSubmitting(false);
        }
    };

    if (sent) {
        return (
            <ShopShell>
                <main className={formStyles.page}>
                    <div className={formStyles.wrap}>
                        <div className={formStyles.done}>
                            <div className={formStyles.doneMark}>
                                <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="#182d44" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
                            </div>
                            <h1>Thank you for your review</h1>
                            <p>We read every review. Yours will show on our home page once we have approved it.</p>
                            <div className={formStyles.doneAction}>
                                <Link to="/" className={shellStyles.btn}>Back to the shop</Link>
                            </div>
                        </div>
                    </div>
                </main>
            </ShopShell>
        );
    }

    return (
        <ShopShell>
            <main className={formStyles.page} id="review-form">
                <div className={formStyles.wrap}>
                    <form className={`${formStyles.fields} ${formStyles.contactCard} ${styles.formCard}`} onSubmit={handleSubmit} noValidate>
                        <h1>Write a review</h1>
                        <p className={formStyles.intro} style={{ marginTop: 0 }}>Only people who bought a HydroLift can write a review. Use the serial code we gave you when you bought it.</p>

                        <label className={formStyles.field} htmlFor="serialCode">
                            Your serial code (required)
                            <input type="text" id="serialCode" autoComplete="off" autoCapitalize="characters" spellCheck={false} placeholder="HL-XXXX-XXXX-XXXX"
                                value={serialCode} onChange={(e) => setSerialCode(e.target.value.toUpperCase())} required />
                        </label>

                        <fieldset className={styles.picker}>
                            <legend className={formStyles.groupTitle}>Your rating (required)</legend>
                            <div className={styles.pickerRow}>
                                {[1, 2, 3, 4, 5].map((n) => (
                                    <label key={n} htmlFor={`star-${n}`} className={styles.pick} title={`${n} ${n === 1 ? 'star' : 'stars'}`}>
                                        <input type="radio" id={`star-${n}`} name="rating" value={n} checked={rating === n} onChange={() => setRating(n)} />
                                        <span className={formStyles.srOnly}>{n} {n === 1 ? 'star' : 'stars'}</span>
                                        <StarShape on={n <= rating} />
                                    </label>
                                ))}
                            </div>
                        </fieldset>

                        <label className={`${formStyles.field} ${name && !validName ? formStyles.invalid : ''}`} htmlFor="reviewName">
                            Name to show (optional)
                            <input type="text" id="reviewName" autoComplete="name" placeholder="e.g. Juan D."
                                value={name} onChange={(e) => setName(e.target.value)} />
                            <span className={formStyles.hint}>{name && !validName ? 'Use letters only, 2 to 60 characters, or leave it empty.' : 'Leave it empty to show "Verified buyer". Your serial code is never shown.'}</span>
                        </label>

                        <label className={`${formStyles.field} ${!validComment ? formStyles.invalid : ''}`} htmlFor="reviewComment">
                            Your review (optional)
                            <textarea id="reviewComment" rows={4} placeholder="How has HydroLift worked for you and your pet?"
                                value={comment} onChange={(e) => setComment(e.target.value)} />
                            <span className={`${formStyles.hint} ${!validComment ? formStyles.hintBad : ''}`}>{comment.length}/{COMMENT_MAX}</span>
                        </label>

                        <div className={formStyles.srOnly} aria-hidden="true">
                            <label htmlFor="website">Leave this empty
                                <input type="text" id="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
                            </label>
                        </div>

                        <div className={formStyles.sendRow}>
                            <p ref={errRef} tabIndex={-1} className={errMsg ? formStyles.error : ''} role="alert" hidden={!errMsg}>{errMsg}</p>
                            <button type="submit" id="sendReview" className={`${shellStyles.btn} ${shellStyles.btnWide}`} disabled={!canSubmit}>
                                {submitting ? 'Sending…' : 'Send review'}
                            </button>
                        </div>
                    </form>
                </div>
            </main>
        </ShopShell>
    );
};
