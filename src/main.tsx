import {Component, type ReactNode, StrictMode} from 'react'
import {createRoot} from 'react-dom/client'
import './index.css'
import App from './App.tsx'

interface Props {
    children?: ReactNode;
}

interface State {
    error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        error: null,
    };

    componentDidCatch(error: Error) {
        this.state.error = error;
        console.error('Error caught in ErrorBoundary:', error);
    }

    render() {
        if (this.state.error) {
            return (
                <div style={{textAlign: 'center', marginTop: '50px'}}>
                    <h1>Всё сломалось 😥</h1>
                    <p>Теперь придётся перезагружать страницу</p>
                    <p>
                        <pre>
                            {JSON.stringify(this.state.error, null, 4)}
                        </pre>
                    </p>
                </div>
            );
        }

        return this.props.children;
    }
}

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <ErrorBoundary>
            <App/>
        </ErrorBoundary>
    </StrictMode>,
)
