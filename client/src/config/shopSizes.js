// The pet house comes in three sizes. The names, who each fits, the inside sizes and the
// pet weight limits are the ones on the Hydrolift Pethouse product page. The order form
// sends the letter (S, M or L), and the server checks it against the same three.
export const SIZES = [
    { value: 'S', name: 'Small', fit: 'Cats, puppies and toy breeds', inside: '50 × 40 × 40 cm', petWeight: 'Up to 7 kg' },
    { value: 'M', name: 'Medium', fit: 'Aspins, beagles, shih tzu', inside: '75 × 55 × 55 cm', petWeight: 'Up to 18 kg' },
    { value: 'L', name: 'Large', fit: 'Labradors, huskies, large aspins', inside: '100 × 70 × 75 cm', petWeight: 'Up to 40 kg' },
];

export const sizeByValue = (value) => SIZES.find((s) => s.value === value) || null;
