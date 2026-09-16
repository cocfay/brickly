import { useEffect, useState } from "react"
import { Container, Row, Col, Alert, Button } from "react-bootstrap"
import { getCurrentUser } from './../../services/authService';
import { checkAndMarkExclusive, checkAndUnmarkExclusive } from '../services/exclusivas';

import img1 from '../assets/images/temp/c1.png'
import img2 from '../assets/images/temp/c2.png'

import Metricas1 from '../components/MetricasAgency'
import MetricasAgent from '../components/metricasAgent'
import MetricasAdmin from '../components/metricasAdmin'

function Home(){
    const user = getCurrentUser();
    const isAgency = user?.roles?.includes('agencia');
    const isAgent = user?.roles?.includes('agente');
    const isAdmin = user?.roles?.includes('admin');

    const [exclusiveResult, setExclusiveResult] = useState(null);
    const [exclusiveLoading, setExclusiveLoading] = useState(false);
    const [cookieDeleted, setCookieDeleted] = useState(false);

    const clearPopupCookies = () => {
        ['brickly_popup_dismissed', 'brickly_subscribed'].forEach(name => {
            [
                '/', '/cpanel', '/cpanel/home', '/cpanel/propiedades',
                '/propiedades', '/proyectos', '/',
            ].forEach(path => {
                document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path}`;
            });
        });
        setCookieDeleted(true);
        setTimeout(() => setCookieDeleted(false), 4000);
    };

    useEffect(() => {
        if (isAdmin) {
            const runExclusiveCheck = async () => {
                setExclusiveLoading(true);
                const markResult = await checkAndMarkExclusive();
                const unmarkResult = await checkAndUnmarkExclusive();
                setExclusiveResult({ mark: markResult, unmark: unmarkResult });
                setExclusiveLoading(false);
            };
            runExclusiveCheck();
        }
    }, [isAdmin]);

    if (isAgency) {
        return(
            <Container className="mb-5">
                <Metricas1 />
            </Container>
        )
    }

    if (isAgent) {
        return(
            <Container className="mb-5">
                <MetricasAgent />
            </Container>
        )
    }

    return(
        <Container className="mb-5">
            {isAdmin && (
                <div className="d-flex justify-content-end mb-3">
                    {cookieDeleted && <Alert variant="success" className="mb-0 me-3 py-2">Cookies del popup eliminadas</Alert>}
                    <Button variant="dark" onClick={clearPopupCookies}>
                        Borrar cookies del popup de suscripción
                    </Button>
                </div>
            )}
            <MetricasAdmin />
        </Container>
    )
}

export default Home
