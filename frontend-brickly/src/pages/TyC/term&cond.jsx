import { Container, Card, Row, Col, Button } from 'react-bootstrap';
import { FormattedMessage } from 'react-intl';

import { Link } from 'react-router-dom';

import img1 from '../../assets/images/terms/1.png';
import img2 from '../../assets/images/terms/2.png';
import img3 from '../../assets/images/terms/3.png';
import img4 from '../../assets/images/terms/4.png';
import img5 from '../../assets/images/terms/5.png';
import img6 from '../../assets/images/terms/6.png';
import img7 from '../../assets/images/terms/7.png';
import img8 from '../../assets/images/terms/8.png';

function Term() {


    const data = [
        { img: img1, titleId: 'terms.text13', descriptionId: 'terms.text14' },
        { img: img2, titleId: 'terms.text15', descriptionId: 'terms.text16' },
        { img: img3, titleId: 'terms.text17', descriptionId: 'terms.text18' },
        { img: img4, titleId: 'terms.text19', descriptionId: 'terms.text20' },
        { img: img5, titleId: 'terms.text21', descriptionId: 'terms.text22' },
        { img: img6, titleId: 'terms.text23', descriptionId: 'terms.text24' },
        { img: img7, titleId: 'terms.text25', descriptionId: 'terms.text26' },
        { img: img8, titleId: 'terms.text27', descriptionId: 'terms.text28' },
    ]

  return (
    <Container className="mb-5">
      <Row className="justify-content-center">
        <Col md={4} className="">
            <div className='fw-normal d-flex flex-column lh-1' style={{ fontSize: 'clamp(48px, 4vw, 84px)', width: 'fit-content' }}>
                <span><FormattedMessage id='terms.text1' /></span>
                <span><FormattedMessage id='terms.text2' /></span>
                <div className='bg-black opacity-100 w-50 mt-4' style={{ height: '2px' }} ></div>
            </div>
            <div className='mt-5'>
                <p>
                    <FormattedMessage id='terms.text3' values={{ b: (chunks) => <b>{chunks}</b> }} />
                </p>

                <p>
                    <FormattedMessage id='terms.text4' />
                </p>

                <p>
                    <FormattedMessage id='terms.text5' />
                </p>

                <div className="d-flex flex-column gap-4 mt-5">
                    <div className="d-flex align-items-center gap-3"><i className="fa-graphite fa-thin fa-buildings fs-4"></i><FormattedMessage id='terms.text6' /></div>
                    <div className="d-flex align-items-center gap-3"><i className="fa-graphite fa-thin fa-location-dot fs-4"></i><FormattedMessage id='terms.text7' /></div>
                    <div className="d-flex align-items-center gap-3"><i className="fa-graphite fa-thin fa-coins fs-4"></i><FormattedMessage id='terms.text8' /></div>
                    <div className="d-flex align-items-center gap-3"><i className="fa-graphite fa-thin fa-shield-check fs-4"></i><FormattedMessage id='terms.text9' /></div>
                </div>

                <div className='mt-5'>
                    <div className='fs-4 lh-sm mb-3 fw-bold d-flex flex-column'>
                        <span><FormattedMessage id='terms.text10' /></span>
                        <span><FormattedMessage id='terms.text10b' /></span>
                    </div>
                    <div><FormattedMessage id='terms.text11' /></div>
                </div>

                <Link to="/propiedades" className='d-block bg-black text-white mt-4 px-4 py-2 rounded-3 mb-5 mb-lg-0' style={{ width: 'fit-content' }}><FormattedMessage id='terms.text12' /></Link>
            </div>
        </Col>
        <Col md={8} className="">
            <Row className='g-5'>
                {
                    data.map((item, index) => ( 
                        <Col md={6} key={index} className="d-flex justify-content-center justify-content-lg-end">
                            <Card className="bg-light border-0 w-100 position-relative shadow terms-card-zoom" style={{ maxWidth: '400px' }}>
                                <div className="terms-card-img" style={{ backgroundImage: `url(${item.img})` }}></div>
                                <Card.Body className='rounded-bottom-4 px-4' style={{ height: '200px' }}>
                                    <Card.Title className='fs-1' style={{ color: 'gray' }}>{index + 1}</Card.Title>
                                    <Card.Text className='d-flex flex-column'>
                                        <span className='fw-bold' style={{ fontSize: '20px' }}><FormattedMessage id={item.titleId} values={{ br: () => <br /> }} /></span>
                                        <span><FormattedMessage id={item.descriptionId} values={{ br: () => <br /> }} /></span>
                                    </Card.Text>
                                </Card.Body>
                            </Card>
                        </Col>
                    ))
                }
                <Col sm={12} className='d-flex justify-content-center justify-content-lg-end'>
                    <Link to="/terms/details" className="text-body"><FormattedMessage id='terms.text29' /></Link>
                </Col>
            </Row>
        </Col>
      </Row>
    </Container>
  );
}

export default Term;
