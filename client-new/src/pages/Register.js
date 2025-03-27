import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Container,
    TextField,
    Typography,
    Paper,
    Snackbar,
    Alert,
    Link
} from '@mui/material';
import { QRCodeSVG } from 'qrcode.react';
import axios from 'axios';

const Register = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [customerCode, setCustomerCode] = useState(null);
    const [walletUrl, setWalletUrl] = useState(null);
    const [points, setPoints] = useState(null);
    const [ws, setWs] = useState(null);
    const [showSnackbar, setShowSnackbar] = useState(false);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleReset = () => {
        // Cerrar WebSocket existente
        if (ws) {
            ws.close();
            setWs(null);
        }

        // Resetear todos los estados
        setCustomerCode(null);
        setWalletUrl(null);
        setPoints(null);
        setSuccess(false);
        setError(null);
        setShowSnackbar(false);
        
        // Limpiar formulario
        setFormData({
            name: '',
            email: '',
            phone: ''
        });
    };

    const onSubmit = async (data) => {
        setLoading(true);
        setError(null);
        console.log('Submitting registration data:', data);

        try {
            const response = await axios.post('/api/register', data);
            console.log('Registration successful:', response.data);
            
            if (response.data.success) {
                const code = response.data.customer.customer_code;
                
                // Asegurarnos de que tenemos la URL de Google Wallet
                if (!response.data.walletUrl) {
                    throw new Error('No se recibió la URL de Google Wallet');
                }
                
                // Actualizar estados en orden
                setCustomerCode(code);
                setWalletUrl(response.data.walletUrl);
                setPoints(response.data.customer.total_points);
                setSuccess(true);
                setShowSnackbar(true);
                
                // Iniciar conexión WebSocket después de actualizar estados
                setTimeout(() => connectWebSocket(code), 100);
            }
        } catch (error) {
            console.error('Error during registration:', error);
            setError(error.message || 'Error al registrar. Por favor intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    // Efecto para limpiar WebSocket al desmontar
    useEffect(() => {
        return () => {
            if (ws) {
                ws.close();
            }
        };
    }, [ws]);

    // Función para conectar WebSocket
    const connectWebSocket = (code) => {
        if (!code) return;

        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${wsProtocol}//${window.location.host}`;
        const newWs = new WebSocket(wsUrl);

        newWs.onopen = () => {
            console.log('WebSocket connected');
            // Registrar para actualizaciones de puntos
            newWs.send(JSON.stringify({
                type: 'register',
                customerCode: code
            }));
        };

        newWs.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'points_update') {
                    console.log('Received points update:', data.points);
                    setPoints(data.points);
                }
            } catch (error) {
                console.error('Error processing WebSocket message:', error);
            }
        };

        newWs.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        newWs.onclose = () => {
            console.log('WebSocket disconnected');
            // Intentar reconectar después de 5 segundos si aún estamos en modo éxito
            if (success) {
                setTimeout(() => connectWebSocket(code), 5000);
            }
        };

        setWs(newWs);
    };

    return (
        <Container component="main" maxWidth="sm">
            <Paper 
                elevation={3} 
                sx={{ 
                    p: 4, 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center',
                    background: 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(10px)',
                    mt: 4
                }}
            >
                <Snackbar 
                    open={showSnackbar} 
                    autoHideDuration={6000} 
                    onClose={() => setShowSnackbar(false)}
                    anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
                >
                    <Alert 
                        onClose={() => setShowSnackbar(false)} 
                        severity="success" 
                        sx={{ width: '100%' }}
                    >
                        ¡Registro exitoso!
                    </Alert>
                </Snackbar>

                {error && (
                    <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
                        {error}
                    </Alert>
                )}

                {!success ? (
                    <Box component="form" onSubmit={(e) => { e.preventDefault(); onSubmit(formData); }} sx={{ mt: 3 }}>
                        <Typography variant="h5" component="h2" gutterBottom sx={{ color: '#1a237e', fontWeight: 'bold', mb: 3 }}>
                            Registro de Entrenador
                        </Typography>

                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            id="name"
                            label="Nombre completo"
                            name="name"
                            autoComplete="name"
                            autoFocus
                            value={formData.name}
                            onChange={handleChange}
                            disabled={loading}
                            sx={{ mb: 2 }}
                        />

                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            id="email"
                            label="Correo electrónico"
                            name="email"
                            autoComplete="email"
                            value={formData.email}
                            onChange={handleChange}
                            disabled={loading}
                            sx={{ mb: 2 }}
                        />

                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            id="phone"
                            label="Teléfono"
                            name="phone"
                            autoComplete="tel"
                            value={formData.phone}
                            onChange={handleChange}
                            disabled={loading}
                            sx={{ mb: 3 }}
                        />

                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            disabled={loading}
                            sx={{
                                mt: 3,
                                mb: 2,
                                backgroundColor: '#1a237e',
                                '&:hover': {
                                    backgroundColor: '#0d47a1'
                                }
                            }}
                        >
                            {loading ? 'Registrando...' : 'Registrar'}
                        </Button>
                    </Box>
                ) : (
                    <Box sx={{ mt: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                        <Typography variant="h6" gutterBottom>
                            ID de Entrenador: {customerCode}
                        </Typography>

                        {points !== null && (
                            <Typography variant="h6" gutterBottom sx={{ color: '#4caf50' }}>
                                Puntos actuales: {points}
                            </Typography>
                        )}

                        <Box sx={{ mt: 2, mb: 4 }}>
                            <QRCodeSVG 
                                value={customerCode}
                                size={200}
                                level="H"
                                includeMargin={true}
                            />
                        </Box>

                        {walletUrl && (
                            <Box sx={{ mt: 2, mb: 2, width: '100%', display: 'flex', justifyContent: 'center' }}>
                                <Button
                                    component="a"
                                    href={walletUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    variant="contained"
                                    color="primary"
                                    sx={{
                                        backgroundColor: '#4285f4',
                                        '&:hover': {
                                            backgroundColor: '#3367d6'
                                        },
                                        mb: 2
                                    }}
                                >
                                    Agregar a Google Wallet
                                </Button>
                            </Box>
                        )}

                        <Button
                            onClick={handleReset}
                            variant="outlined"
                            sx={{ mt: 2 }}
                        >
                            Registrar otro entrenador
                        </Button>
                    </Box>
                )}
            </Paper>
        </Container>
    );
};

export default Register;
