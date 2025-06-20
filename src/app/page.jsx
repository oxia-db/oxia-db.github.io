export default function IndexPage() {
    return (
        <div className="home-content" style={{height: '86vh'}}>

            <div align="center">
                <img src="/oxia-logo.svg" alt="oxia logo" width="250"/>
            </div>

            <h1 className="headline" style={{
                textAlign: 'center',
                fontSize: 32,
                margin: '50 50',
                // fontWeight: 'bold'
            }}>
                Oxia ― Metadata Store and Coordination System
            </h1>

             <p style={{margin: '1rem 5rem', fontSize: '1.2rem', color: '#555'}}>
                Oxia is a robust, scalable metadata store and coordination system designed for large-scale distributed
                systems, with built-in support for stream index storage to optimize real-time data management.
            </p>

            <div style={{marginTop: '2rem', alignItems: 'center', display: 'flex', justifyContent: 'center'}}>
                <a href="/docs/what-is-oxia" style={{
                    margin: '1rem 2rem',
                    padding: '0.75rem 1.5rem',
                    backgroundColor: '#0070f3',
                    color: 'white',
                    borderRadius: '6px',
                    textDecoration: 'none',
                    fontWeight: 'bold'
                }}>
                    What is Oxia?
                </a>

                <a href="/docs/getting-started" style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: '#0070f3',
                    color: 'white',
                    borderRadius: '6px',
                    textDecoration: 'none',
                    fontWeight: 'bold'
                }}>
                    Get Started
                </a>
            </div>
        </div>
    )
}
