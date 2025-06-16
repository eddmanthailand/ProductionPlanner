// Clear localStorage auth data
localStorage.removeItem('token');
localStorage.removeItem('user');
console.log('Auth data cleared. Please refresh the page.');
window.location.href = '/login';
