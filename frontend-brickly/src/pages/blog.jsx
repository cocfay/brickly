import Container from 'react-bootstrap/Container';

import blog from '../assets/images/blog/blog.jpg';

function Blog() {
    return (
        <Container>
            <img src={blog} alt="blog" style={{ width: '100%' }} srcset="" />
        </Container>
    );
}

export default Blog;