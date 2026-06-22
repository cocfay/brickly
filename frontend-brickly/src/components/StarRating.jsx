/**
 * StarRating — muestra el promedio y las estrellas de un agente.
 * Props:
 *   rating    {number}  promedio (0-5), ej: 3.83
 *   size      {string}  fontSize de las estrellas y del badge, default '12px'
 *
 * Lógica de estrellas:
 *   0.0 – 0.4  → estrella vacía
 *   0.5 – 0.9  → media estrella
 *   1.0        → estrella llena
 *
 * Ejemplo: 4.2 → 4 llenas | 4.5 → 4 llenas + media | 5.0 → 5 llenas
 */
function StarRating({ rating = 0, size = '12px' }) {
    const value = rating || 0;

    // Redondear a 0.5 más cercano para las estrellas
    const rounded = Math.round(value * 2) / 2;

    // Si tiene más de 1 decimal, cortar a 1 decimal sin redondear
    const strVal   = String(value);
    const dotIndex = strVal.indexOf('.');
    const display  = value === 0 ? '0'
        : dotIndex !== -1 && strVal.length - dotIndex - 1 > 1
            ? strVal.slice(0, dotIndex + 2)  // "4.666..." → "4.6"
            : strVal;                         // "4.5" o "5" → sin cambio

    const numericSize = parseInt(size) + 4;
    const actualSize  = `${numericSize}px`;

    // Si tiene decimal, reducir 2px para que quepa bien en el círculo
    const badgeSize = display.includes('.') ? `${numericSize - 2}px` : actualSize;

    return (
        <div className='d-flex gap-1 align-items-center'>
            <span style={{
                backgroundColor: 'black',
                color: 'white',
                borderRadius: '50%',
                fontSize: badgeSize,
                width: `calc(${actualSize} * 2)`,
                height: `calc(${actualSize} * 2)`,
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
            }}>
                {display}
            </span>
            {[1, 2, 3, 4, 5].map(n => {
                let icon  = 'fa-regular fa-star';
                let color = '#ccc';
                if (n <= Math.floor(rounded)) {
                    icon  = 'fa-solid fa-star';
                    color = 'gold';
                } else if (n - 0.5 === rounded) {
                    icon  = 'fa-solid fa-star-half-stroke';
                    color = 'gold';
                }
                return <i key={n} className={icon} style={{ color, fontSize: actualSize }}></i>;
            })}
        </div>
    );
}

export default StarRating;
