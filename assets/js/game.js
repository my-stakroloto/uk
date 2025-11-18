(function() {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const playerScoreEl = document.getElementById('playerScore');
    const aiScoreEl = document.getElementById('aiScore');
    const newGameBtn = document.getElementById('newGameBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const resetBtn = document.getElementById('resetBtn');

    // Enhanced game state with new features
    let gameState = {
        playing: true,
        paused: false,
        playerScore: 0,
        aiScore: 0,
        winner: null,
        level: 1,
        powerUps: [],
        targetScore: 11,
        difficulty: 'normal',
        effects: []
    };

    // Enhanced table with cyberpunk styling
    const table = {
        x: 50,
        y: 220,
        width: canvas.width - 100,
        height: 160,
        netHeight: 25,
        color: '#0a0a0f',
        borderColor: '#00ffff',
        netColor: '#ff00ff',
        glowIntensity: 0
    };

    // Enhanced paddle properties
    const paddleWidth = 90;
    const paddleHeight = 14;
    
    const player = {
        x: canvas.width / 2 - paddleWidth / 2,
        y: table.y + table.height + 50,
        width: paddleWidth,
        height: paddleHeight,
        color: '#00ffff',
        glowColor: '#00ffff',
        speed: 9,
        powerUp: null,
        energy: 100
    };

    const ai = {
        x: canvas.width / 2 - paddleWidth / 2,
        y: table.y - 64,
        width: paddleWidth,
        height: paddleHeight,
        color: '#ff00ff',
        glowColor: '#ff00ff',
        speed: 6.5,
        difficulty: 0.82,
        powerUp: null,
        energy: 100,
        predictiveOffset: 0
    };

    // Enhanced ball with special effects
    const ball = {
        x: canvas.width / 2,
        y: canvas.height / 2,
        radius: 10,
        vx: Math.random() > 0.5 ? 5 : -5,
        vy: Math.random() > 0.5 ? 4 : -4,
        color: '#ffffff',
        glowColor: '#ffffff',
        trail: [],
        maxTrail: 12,
        spinning: 0,
        lastHitBy: null,
        speed: 1,
        powerUp: null,
        energy: 0
    };

    // Particle system for enhanced effects
    const particles = [];
    const powerUps = [];

    // Enhanced Particle class
    class Particle {
        constructor(x, y, color = '#00ffff', type = 'spark') {
            this.x = x;
            this.y = y;
            this.vx = (Math.random() - 0.5) * 10;
            this.vy = (Math.random() - 0.5) * 10;
            this.life = 1.0;
            this.decay = Math.random() * 0.02 + 0.01;
            this.color = color;
            this.size = Math.random() * 6 + 3;
            this.type = type;
            this.angle = Math.random() * Math.PI * 2;
            this.spin = (Math.random() - 0.5) * 0.2;
        }

        update() {
            this.x += this.vx;
            this.y += this.vy;
            this.vx *= 0.97;
            this.vy *= 0.97;
            this.life -= this.decay;
            this.size *= 0.97;
            this.angle += this.spin;
        }

        draw() {
            if (this.life <= 0) return;
            ctx.save();
            ctx.globalAlpha = this.life;
            ctx.translate(this.x, this.y);
            ctx.rotate(this.angle);
            
            if (this.type === 'spark') {
                ctx.fillStyle = this.color;
                ctx.fillRect(-this.size/2, -this.size/8, this.size, this.size/4);
            } else {
                ctx.beginPath();
                ctx.arc(0, 0, this.size, 0, Math.PI * 2);
                ctx.fillStyle = this.color;
                ctx.fill();
            }
            ctx.restore();
        }
    }

    // Power-up class
    class PowerUp {
        constructor(x, y, type) {
            this.x = x;
            this.y = y;
            this.type = type;
            this.radius = 15;
            this.angle = 0;
            this.life = 300; // 5 seconds at 60fps
            this.collected = false;
            this.colors = {
                speed: '#ff6b6b',
                size: '#4ecdc4',
                multi: '#ffe66d',
                freeze: '#a8e6cf'
            };
        }

        update() {
            this.angle += 0.1;
            this.life--;
        }

        draw() {
            if (this.collected || this.life <= 0) return;
            
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.angle);
            
            // Glow effect
            ctx.shadowColor = this.colors[this.type];
            ctx.shadowBlur = 20;
            
            // Power-up circle
            ctx.beginPath();
            ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = this.colors[this.type] + '40';
            ctx.fill();
            ctx.strokeStyle = this.colors[this.type];
            ctx.lineWidth = 3;
            ctx.stroke();
            
            // Icon
            ctx.fillStyle = this.colors[this.type];
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const icons = { speed: '⚡', size: '🎯', multi: '✨', freeze: '❄️' };
            ctx.fillText(icons[this.type], 0, 0);
            
            ctx.restore();
        }
    }

    // Enhanced mouse tracking
    let mouse = { x: 0, y: 0, smoothX: 0, smoothY: 0 };
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        mouse.x = (e.clientX - rect.left) * (canvas.width / rect.width);
        mouse.y = (e.clientY - rect.top) * (canvas.height / rect.height);
    });

    // Button events
    newGameBtn.addEventListener('click', newGame);
    pauseBtn.addEventListener('click', togglePause);
    resetBtn.addEventListener('click', resetScore);

    function newGame() {
        resetBall();
        gameState.winner = null;
        gameState.playing = true;
        gameState.paused = false;
        gameState.powerUps = [];
        particles.length = 0;
        powerUps.length = 0;
        pauseBtn.textContent = 'PAUSE';
        
        // Reset power-ups
        player.powerUp = null;
        ai.powerUp = null;
        ball.powerUp = null;
    }

    function togglePause() {
        gameState.paused = !gameState.paused;
        pauseBtn.textContent = gameState.paused ? 'RESUME' : 'PAUSE';
    }

    function resetScore() {
        gameState.playerScore = 0;
        gameState.aiScore = 0;
        gameState.level = 1;
        playerScoreEl.textContent = '0';
        aiScoreEl.textContent = '0';
        newGame();
    }

    function createHitEffect(x, y, color, intensity = 1) {
        const particleCount = Math.floor(12 * intensity);
        for (let i = 0; i < particleCount; i++) {
            particles.push(new Particle(x, y, color, Math.random() > 0.5 ? 'spark' : 'circle'));
        }
        
        // Screen shake effect
        canvas.style.transform = `translate(${Math.random() * 4 - 2}px, ${Math.random() * 4 - 2}px)`;
        setTimeout(() => {
            canvas.style.transform = 'translate(0, 0)';
        }, 100);
    }

    function spawnPowerUp() {
        if (powerUps.length < 2 && Math.random() < 0.003) {
            const types = ['speed', 'size', 'multi', 'freeze'];
            const type = types[Math.floor(Math.random() * types.length)];
            const x = table.x + Math.random() * table.width;
            const y = table.y + Math.random() * table.height;
            powerUps.push(new PowerUp(x, y, type));
        }
    }

    function checkPowerUpCollision() {
        powerUps.forEach((powerUp, index) => {
            if (powerUp.collected || powerUp.life <= 0) {
                powerUps.splice(index, 1);
                return;
            }
            
            const dx = ball.x - powerUp.x;
            const dy = ball.y - powerUp.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < ball.radius + powerUp.radius) {
                powerUp.collected = true;
                activatePowerUp(powerUp.type);
                createHitEffect(powerUp.x, powerUp.y, powerUp.colors[powerUp.type], 2);
                powerUps.splice(index, 1);
            }
        });
    }

    function activatePowerUp(type) {
        ball.powerUp = type;
        ball.energy = 180; // 3 seconds
        
        switch(type) {
            case 'speed':
                ball.vx *= 1.5;
                ball.vy *= 1.5;
                ball.glowColor = '#ff6b6b';
                break;
            case 'size':
                ball.radius *= 1.5;
                ball.glowColor = '#4ecdc4';
                break;
            case 'freeze':
                ai.speed *= 0.3;
                ball.glowColor = '#a8e6cf';
                break;
            case 'multi':
                // Create additional balls (simplified)
                ball.glowColor = '#ffe66d';
                break;
        }
    }

    function updatePowerUps() {
        if (ball.energy > 0) {
            ball.energy--;
        } else if (ball.powerUp) {
            // Deactivate power-up
            switch(ball.powerUp) {
                case 'size':
                    ball.radius = 10;
                    break;
                case 'freeze':
                    ai.speed = 6.5;
                    break;
            }
            ball.powerUp = null;
            ball.glowColor = '#ffffff';
        }
    }

    function drawTable() {
        ctx.save();
        
        // Enhanced table with neon glow
        ctx.shadowColor = table.borderColor;
        ctx.shadowBlur = 15 + Math.sin(Date.now() * 0.005) * 5;
        
        // Table surface with gradient
        const gradient = ctx.createLinearGradient(table.x, table.y, table.x, table.y + table.height);
        gradient.addColorStop(0, '#0a0a0f');
        gradient.addColorStop(0.5, '#1a0a2e');
        gradient.addColorStop(1, '#0a0a0f');
        ctx.fillStyle = gradient;
        ctx.fillRect(table.x, table.y, table.width, table.height);
        
        // Glowing border
        ctx.strokeStyle = table.borderColor;
        ctx.lineWidth = 4;
        ctx.strokeRect(table.x, table.y, table.width, table.height);
        
        // Center line with glow
        ctx.beginPath();
        ctx.moveTo(table.x, table.y + table.height / 2);
        ctx.lineTo(table.x + table.width, table.y + table.height / 2);
        ctx.strokeStyle = table.borderColor;
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Enhanced net with animation
        const netX = table.x + table.width / 2 - 3;
        const netGradient = ctx.createLinearGradient(netX, table.y - table.netHeight, netX, table.y + table.height + table.netHeight);
        netGradient.addColorStop(0, table.netColor);
        netGradient.addColorStop(0.5, '#ffffff');
        netGradient.addColorStop(1, table.netColor);
        
        ctx.fillStyle = netGradient;
        ctx.fillRect(netX, table.y - table.netHeight, 6, table.height + table.netHeight * 2);
        
        // Net mesh pattern with glow
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 15; i++) {
            const y = table.y - table.netHeight + (i * (table.height + table.netHeight * 2) / 15);
            ctx.beginPath();
            ctx.moveTo(netX, y);
            ctx.lineTo(netX + 6, y);
            ctx.stroke();
        }
        
        ctx.restore();
    }

    function drawPaddle(paddle, name) {
        ctx.save();
        
        // Enhanced paddle glow
        ctx.shadowColor = paddle.glowColor;
        ctx.shadowBlur = 20 + Math.sin(Date.now() * 0.01) * 5;
        
        // Paddle body with cyberpunk gradient
        const gradient = ctx.createLinearGradient(paddle.x, paddle.y, paddle.x, paddle.y + paddle.height);
        gradient.addColorStop(0, paddle.color);
        gradient.addColorStop(0.3, paddle.color + 'aa');
        gradient.addColorStop(0.7, paddle.color + '66');
        gradient.addColorStop(1, paddle.color + '33');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
        
        // Glowing border
        ctx.strokeStyle = paddle.color;
        ctx.lineWidth = 3;
        ctx.strokeRect(paddle.x, paddle.y, paddle.width, paddle.height);
        
        // Energy bar
        const energyWidth = paddle.width * 0.8;
        const energyHeight = 4;
        const energyX = paddle.x + (paddle.width - energyWidth) / 2;
        const energyY = paddle === player ? paddle.y + paddle.height + 8 : paddle.y - 12;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(energyX, energyY, energyWidth, energyHeight);
        
        const energyPercent = paddle.energy / 100;
        const energyColor = energyPercent > 0.5 ? '#00ff88' : energyPercent > 0.2 ? '#ffff00' : '#ff4444';
        ctx.fillStyle = energyColor;
        ctx.fillRect(energyX, energyY, energyWidth * energyPercent, energyHeight);
        
        // Handle with glow
        const handleWidth = 24;
        const handleHeight = 8;
        const handleX = paddle.x + paddle.width / 2 - handleWidth / 2;
        const handleY = paddle === player ? paddle.y + paddle.height : paddle.y - handleHeight;
        
        ctx.fillStyle = '#666666';
        ctx.fillRect(handleX, handleY, handleWidth, handleHeight);
        ctx.strokeStyle = '#aaaaaa';
        ctx.lineWidth = 1;
        ctx.strokeRect(handleX, handleY, handleWidth, handleHeight);
        
        // Player name with glow
        ctx.fillStyle = paddle.color;
        ctx.font = 'bold 16px Orbitron, Arial';
        ctx.textAlign = 'center';
        ctx.shadowBlur = 10;
        const textY = paddle === player ? paddle.y + paddle.height + 35 : paddle.y - 35;
        ctx.fillText(name, paddle.x + paddle.width / 2, textY);
        
        ctx.restore();
    }

    function drawBall() {
        ctx.save();
        
        // Enhanced ball trail
        for (let i = 0; i < ball.trail.length; i++) {
            const trail = ball.trail[i];
            const alpha = ((i + 1) / ball.trail.length) * 0.6;
            ctx.globalAlpha = alpha;
            
            // Trail glow
            ctx.shadowColor = ball.glowColor;
            ctx.shadowBlur = 15;
            
            const trailGradient = ctx.createRadialGradient(trail.x, trail.y, 0, trail.x, trail.y, ball.radius * alpha);
            trailGradient.addColorStop(0, ball.glowColor + 'aa');
            trailGradient.addColorStop(1, ball.glowColor + '00');
            
            ctx.fillStyle = trailGradient;
            ctx.beginPath();
            ctx.arc(trail.x, trail.y, ball.radius * alpha, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();

        // Main ball with enhanced effects
        ctx.save();
        
        // Power-up aura
        if (ball.powerUp) {
            ctx.shadowColor = ball.glowColor;
            ctx.shadowBlur = 25 + Math.sin(Date.now() * 0.02) * 10;
            
            ctx.beginPath();
            ctx.arc(ball.x, ball.y, ball.radius + 8, 0, Math.PI * 2);
            ctx.strokeStyle = ball.glowColor + '60';
            ctx.lineWidth = 4;
            ctx.stroke();
        }
        
        // Ball shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
        ctx.shadowBlur = 12;
        ctx.shadowOffsetX = 3;
        ctx.shadowOffsetY = 3;
        
        // Ball gradient
        const ballGradient = ctx.createRadialGradient(
            ball.x - 3, ball.y - 3, 0,
            ball.x, ball.y, ball.radius
        );
        ballGradient.addColorStop(0, '#ffffff');
        ballGradient.addColorStop(0.6, '#f0f0f0');
        ballGradient.addColorStop(1, ball.glowColor);
        
        ctx.fillStyle = ballGradient;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Ball glow
        ctx.shadowColor = ball.glowColor;
        ctx.shadowBlur = 20;
        ctx.strokeStyle = ball.glowColor;
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Spin indicator
        if (Math.abs(ball.spinning) > 0.1) {
            ctx.save();
            ctx.translate(ball.x, ball.y);
            ctx.rotate(Date.now() * 0.01);
            ctx.strokeStyle = '#ff6b6b';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 0, ball.radius + 6, 0, Math.PI * 1.5);
            ctx.stroke();
            ctx.restore();
        }
        
        ctx.restore();

        // Update trail
        ball.trail.push({ x: ball.x, y: ball.y });
        if (ball.trail.length > ball.maxTrail) {
            ball.trail.shift();
        }
    }

    function updatePlayer() {
        // Enhanced smooth player movement
        const targetX = Math.max(table.x, Math.min(table.x + table.width - player.width, mouse.x - player.width / 2));
        const dx = targetX - player.x;
        player.x += dx * 0.18;
        
        // Update energy based on movement
        const speed = Math.abs(dx);
        if (speed > 2) {
            player.energy = Math.min(100, player.energy + 0.5);
        }
    }

    function updateAI() {
        // Enhanced AI with difficulty scaling and prediction
        const ballCenterX = ball.x;
        const paddleCenterX = ai.x + ai.width / 2;
        
        let targetX = ballCenterX;
        
        // Improved prediction algorithm
        if (ball.vy < 0) {
            const timeToReach = Math.abs((ai.y - ball.y) / ball.vy);
            targetX = ball.x + ball.vx * timeToReach * (0.8 + gameState.level * 0.02);
            
            // Account for wall bounces
            if (targetX < table.x || targetX > table.x + table.width) {
                targetX = ball.x - ball.vx * timeToReach * 0.5;
            }
        }
        
        // Dynamic difficulty adjustment
        const difficultyMultiplier = 0.7 + gameState.level * 0.03;
        const error = (Math.random() - 0.5) * (1 - ai.difficulty * difficultyMultiplier) * 120;
        targetX += error;
        
        // Smooth AI movement with acceleration
        const dx = targetX - paddleCenterX;
        if (Math.abs(dx) > 8) {
            const acceleration = Math.sign(dx) * ai.speed * (1 + Math.min(gameState.level * 0.1, 0.5));
            ai.x = Math.max(table.x, Math.min(table.x + table.width - ai.width, ai.x + acceleration));
        }
        
        // AI energy management
        if (Math.abs(dx) > 5) {
            ai.energy = Math.min(100, ai.energy + 0.3);
        }
    }

    function checkCollision(rect, ball) {
        return ball.x + ball.radius > rect.x &&
               ball.x - ball.radius < rect.x + rect.width &&
               ball.y + ball.radius > rect.y &&
               ball.y - ball.radius < rect.y + rect.height;
    }

    function updateBall() {
        if (!gameState.playing || gameState.paused) return;

        ball.x += ball.vx;
        ball.y += ball.vy;
        
        // Apply enhanced spin effects
        ball.vx += ball.spinning * 0.15;
        ball.spinning *= 0.98;

        // Enhanced wall collisions
        if (ball.x - ball.radius < table.x || ball.x + ball.radius > table.x + table.width) {
            ball.vx = -ball.vx * 1.02;
            ball.spinning = -ball.spinning;
            createHitEffect(ball.x, ball.y, '#ffffff', 1.5);
            
            // Wall bounce sound effect (visual feedback)
            table.glowIntensity = 30;
        }

        // Enhanced net collision
        const netX = table.x + table.width / 2;
        if (Math.abs(ball.x - netX) < ball.radius + 3 &&
            ball.y > table.y - table.netHeight &&
            ball.y < table.y + table.height) {
            ball.vx = -ball.vx * 0.95;
            ball.vy = Math.abs(ball.vy) * (ball.y < table.y + table.height / 2 ? -1 : 1);
            createHitEffect(ball.x, ball.y, '#ff00ff', 2);
        }

        // Enhanced player paddle collision
        if (checkCollision(player, ball) && ball.vy > 0) {
            ball.vy = -Math.abs(ball.vy) - 0.8;
            
            // Advanced paddle physics
            const hitPosition = (ball.x - (player.x + player.width / 2)) / (player.width / 2);
            const paddleSpeed = (mouse.x - player.x - player.width / 2) * 0.4;
            
            ball.vx += hitPosition * 3 + paddleSpeed * 0.4;
            ball.spinning = hitPosition * 0.08 + paddleSpeed * 0.02;
            
            // Energy-based power hits
            if (player.energy > 80) {
                ball.vx *= 1.2;
                ball.vy *= 1.2;
                player.energy -= 20;
                createHitEffect(ball.x, ball.y, player.color, 3);
            } else {
                createHitEffect(ball.x, ball.y, player.color, 1.5);
            }
            
            ball.lastHitBy = 'player';
        }

        // Enhanced AI paddle collision
        if (checkCollision(ai, ball) && ball.vy < 0) {
            ball.vy = Math.abs(ball.vy) + 0.8;
            
            const paddleCenter = ai.x + ai.width / 2;
            const hitPosition = (ball.x - paddleCenter) / (ai.width / 2);
            
            // Strategic AI shots
            const strategy = Math.random();
            if (strategy < 0.3) {
                // Aggressive shot
                ball.vx += hitPosition * 4;
                ball.spinning = hitPosition * 0.12;
            } else if (strategy < 0.7) {
                // Placement shot
                ball.vx += (Math.random() - 0.5) * 3;
                ball.spinning = (Math.random() - 0.5) * 0.1;
            } else {
                // Power shot
                if (ai.energy > 70) {
                    ball.vx *= 1.15;
                    ball.vy *= 1.15;
                    ai.energy -= 15;
                    createHitEffect(ball.x, ball.y, ai.color, 2.5);
                }
            }
            
            if (!createHitEffect.called) {
                createHitEffect(ball.x, ball.y, ai.color, 1.5);
            }
            ball.lastHitBy = 'ai';
        }

        // Enhanced scoring system
        if (ball.y > canvas.height + 50) {
            gameState.aiScore++;
            aiScoreEl.textContent = gameState.aiScore;
            if (ball.lastHitBy === 'player') {
                gameState.level = Math.max(1, gameState.level - 0.2);
            }
            resetBall();
            createScoreEffect('ai');
        } else if (ball.y < -50) {
            gameState.playerScore++;
            playerScoreEl.textContent = gameState.playerScore;
            gameState.level += 0.3;
            resetBall();
            createScoreEffect('player');
        }

        // Enhanced win conditions
        const scoreDiff = Math.abs(gameState.playerScore - gameState.aiScore);
        if ((gameState.playerScore >= gameState.targetScore || gameState.aiScore >= gameState.targetScore) && scoreDiff >= 2) {
            gameState.winner = gameState.playerScore > gameState.aiScore ? 'PLAYER' : 'CYBER AI';
            gameState.playing = false;
        }

        // Enhanced speed management
        const currentSpeed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
        const maxSpeed = 15 + gameState.level * 0.5;
        const minSpeed = 4;
        
        if (currentSpeed > maxSpeed) {
            const ratio = maxSpeed / currentSpeed;
            ball.vx *= ratio;
            ball.vy *= ratio;
        } else if (currentSpeed < minSpeed) {
            const ratio = minSpeed / currentSpeed;
            ball.vx *= ratio;
            ball.vy *= ratio;
        }
    }

    function createScoreEffect(scorer) {
        const color = scorer === 'player' ? '#00ffff' : '#ff00ff';
        const x = canvas.width / 2;
        const y = canvas.height / 2;
        
        for (let i = 0; i < 25; i++) {
            particles.push(new Particle(x, y, color, 'spark'));
        }
    }

    function resetBall() {
        ball.x = canvas.width / 2;
        ball.y = canvas.height / 2;
        ball.vx = (Math.random() > 0.5 ? 1 : -1) * (4 + Math.random() * 2);
        ball.vy = (Math.random() > 0.5 ? 1 : -1) * (3 + Math.random() * 2);
        ball.spinning = 0;
        ball.trail = [];
        ball.powerUp = null;
        ball.energy = 0;
        ball.glowColor = '#ffffff';
        ball.radius = 10;
    }

    function updateParticles() {
        for (let i = particles.length - 1; i >= 0; i--) {
            const particle = particles[i];
            particle.update();
            if (particle.life <= 0) {
                particles.splice(i, 1);
            }
        }
    }

    function drawUI() {
        // Enhanced pause screen
        if (gameState.paused) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.save();
            ctx.shadowColor = '#00ffff';
            ctx.shadowBlur = 20;
            ctx.fillStyle = '#00ffff';
            ctx.font = 'bold 48px Orbitron, Arial';
            ctx.textAlign = 'center';
            ctx.fillText('SYSTEM PAUSED', canvas.width / 2, canvas.height / 2);
            ctx.restore();
        }

        // Enhanced win screen
        if (gameState.winner) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            const winColor = gameState.winner === 'PLAYER' ? '#00ffff' : '#ff00ff';
            
            ctx.save();
            ctx.shadowColor = winColor;
            ctx.shadowBlur = 30;
            ctx.fillStyle = winColor;
            ctx.font = 'bold 56px Orbitron, Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`${gameState.winner} WINS!`, canvas.width / 2, canvas.height / 2 - 40);
            
            ctx.fillStyle = '#ffffff';
            ctx.font = '24px Orbitron, Arial';
            ctx.shadowBlur = 15;
            ctx.fillText('Click "NEW MATCH" to continue', canvas.width / 2, canvas.height / 2 + 20);
            
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.font = '18px Exo 2, Arial';
            ctx.fillText(`Final Score: ${gameState.playerScore} - ${gameState.aiScore}`, canvas.width / 2, canvas.height / 2 + 60);
            ctx.restore();
        }

        // Enhanced HUD
        ctx.save();
        ctx.fillStyle = 'rgba(0, 255, 255, 0.8)';
        ctx.font = '16px Orbitron, Arial';
        ctx.textAlign = 'left';
        
        const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
        const level = gameState.level.toFixed(1);
        
        ctx.fillText(`BALL VELOCITY: ${speed.toFixed(1)}`, 20, canvas.height - 60);
        ctx.fillText(`DIFFICULTY LEVEL: ${level}`, 20, canvas.height - 40);
        ctx.fillText(`TARGET SCORE: ${gameState.targetScore}`, 20, canvas.height - 20);
        
        // Power-up indicator
        if (ball.powerUp) {
            ctx.fillStyle = ball.glowColor;
            ctx.textAlign = 'right';
            ctx.fillText(`ACTIVE: ${ball.powerUp.toUpperCase()} (${Math.ceil(ball.energy / 60)}s)`, canvas.width - 20, canvas.height - 20);
        }
        
        ctx.restore();
    }

    function gameLoop() {
        // Enhanced background with animated gradient
        const time = Date.now() * 0.001;
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, `hsl(${240 + Math.sin(time) * 10}, 80%, 5%)`);
        gradient.addColorStop(0.5, `hsl(${260 + Math.cos(time * 0.7) * 15}, 70%, 8%)`);
        gradient.addColorStop(1, `hsl(${220 + Math.sin(time * 1.3) * 20}, 60%, 12%)`);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw game elements
        drawTable();
        drawPaddle(ai, 'CYBER AI');
        drawPaddle(player, 'PLAYER');
        
        // Draw power-ups
        powerUps.forEach(powerUp => {
            powerUp.update();
            powerUp.draw();
        });
        
        drawBall();

        // Update game state
        if (!gameState.paused) {
            updatePlayer();
            updateAI();
            updateBall();
            updateParticles();
            updatePowerUps();
            spawnPowerUp();
            checkPowerUpCollision();
        }

        // Draw particles
        particles.forEach(particle => particle.draw());

        // Draw UI
        drawUI();

        requestAnimationFrame(gameLoop);
    }

    // Initialize game
    resetBall();
    gameLoop();
})();