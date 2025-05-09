import Layout from '../components/Layout';
import TokenTabs from '../components/TokenTabs';

export default function App() {
    return (
        <Layout title="CurveLaunch | App">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-3xl font-bold mb-8 text-white">Bonding Curve Trading</h1>
                <TokenTabs />
            </div>
        </Layout>
    );
} 