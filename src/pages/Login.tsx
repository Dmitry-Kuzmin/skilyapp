import { AuthModalNew } from '@/components/AuthModalNew';
import { useNavigate } from 'react-router-dom';

export default function Login() {
    const navigate = useNavigate();

    return (
        <AuthModalNew
            open={true}
            variant="page"
            onClose={() => navigate('/')}
        />
    );
}
