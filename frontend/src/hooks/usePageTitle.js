import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const usePageTitle = (title) => {
    const location = useLocation();

    useEffect(() => {
        document.title = title ? `${title} | FonoApp` : 'FonoApp';
    }, [location, title]);
};

export default usePageTitle;
