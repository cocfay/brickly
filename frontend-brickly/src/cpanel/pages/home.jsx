import { useEffect, useState } from "react"
import { Container, Row, Col, Alert } from "react-bootstrap"
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
            <MetricasAdmin />
        </Container>
    )
}

export default Home
