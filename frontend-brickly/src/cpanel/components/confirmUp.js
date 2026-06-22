import alertify from 'alertifyjs';

export const confirm = (cantidad, label = 'propiedad(es)') => {
    return new Promise((resolve) => {
        alertify.confirm(
        'BRICKLY HOMES',
        `¿Estás seguro de que deseas eliminar ${cantidad} ${label}?`,
        () => resolve(true),  // OK -> Retorna true
        () => resolve(false)  // Cancel -> Retorna false
        );
    });
};


export default confirm;