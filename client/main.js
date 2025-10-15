// Import the Discord SDK
import { DiscordSDK } from "@discord/embedded-app-sdk";

import "./style.css"

const MAX_PLAYERS = 4;
const BOT_ID = "1427817156573265920";

let players = [];
let discordSdk;
let currentUser;

const joinBtn = document.getElementById('joinBtn');
const sendItBtn = document.getElementById('sendIt');
const playerList = document.getElementById('playerList');

async function init() {
    //------------------Getting User Info------------------//
    discordSdk = new DiscordSDK(import.meta.env.VITE_DISCORD_CLIENT_ID);
    await discordSdk.ready();

    const { code } = await discordSdk.commands.authorize({
        client_id: import.meta.env.VITE_DISCORD_CLIENT_ID,
        response_type: "code",
        state: "",
        prompt: "none",
        scope: ["identify", "guilds", "applications.commands"],
    });

    const response = await fetch("/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
    });

    const { access_token } = await response.json();

    const auth = await discordSdk.commands.authenticate({ access_token });
    if (!auth) {
        document.getElementById("status").innerText = "Authentication failed";
        return;
    }

    currentUser = auth.user;

    // Add self to activity
    //await joinActivityList();

    // player = { id: currentUser.id, name: currentUser.username, status: 'gray' };
    // players.push(player);


    let player = { id: currentUser.id, name: currentUser.username, status: 'gray' };
    players.push(player);
    renderPlayers();

    // Subscribe to updates
    await discordSdk.subscribe("ACTIVITY_INSTANCE_PARTICIPANTS_UPDATE", ({ activity_i }) => {
        if (!activity_i || !activity_i.state) return;
        try {
            players = JSON.parse(activity_i.state);
            console.log("Players updated:", players);
            renderPlayers();
        } catch (e) {
            console.error("Failed to parse activity update:", e);
        }
    });

}

function renderPlayers() {
    playerList.innerHTML = '';
    const greenCount = players.filter(p => p.status === 'green').length;

    players.forEach(player => {
        const span = document.createElement('span');
        span.textContent = player.name;
        span.className = 'player-name';

        if (player.status === 'green') span.classList.add('player-green');
        else if (greenCount >= 4 && player.status !== 'green') span.classList.add('player-gray');
        else span.classList.add('player-red');

        playerList.appendChild(span);
    });

    sendItBtn.disabled = false;
}

joinBtn.addEventListener('click', async () => {
    // Find the current user in a player array
    let player = players.find(p => p.id === currentUser.id);

   if (player.status === 'green') {
        // Leaving
        player.status = 'red';
        joinBtn.textContent = "Join";
        joinBtn.style.backgroundColor = "#5865f2"; // original blue
    } else if (players.filter(p => p.status === 'green').length < MAX_PLAYERS) {
        // Rejoining if under max players
        player.status = 'green';
        joinBtn.textContent = "Leave";
        joinBtn.style.backgroundColor = "#f04747"; // red
    }

    // Update spectators (gray) if max green reached
    const greenCount = players.filter(p => p.status === 'green').length;
    if (greenCount >= MAX_PLAYERS) {
        players.forEach(p => {
            if (p.status !== 'green') p.status = 'gray';
        });
    } else {
        players.forEach(p => {
            if (p.status === 'gray') p.status = 'red';
        });
    }

    // Broadcast updated state
    if (discordSdk?.activity) {
        await discordSdk.activity.update({ state: JSON.stringify(players) });
    }

    renderPlayers();
});

sendItBtn.addEventListener('click', async () => {
    const greenPlayers = players.filter(p => p.status === 'green');

    if (greenPlayers.length >= 2) {
        try {
            const guild = await discordSdk.commands.getGuild();
            const botMember = await discordSdk.commands.getGuildMember(guild.id, BOT_ID);

            if (!botMember) {
                alert("⚠ The bot must be in this server to start the game.");
                return;
            }
        } catch (err) {
            console.error("Failed to check bot presence:", err);
            alert("⚠ Failed to verify bot. Cannot send.");
            return;
        }
    }

    alert("🎯 Game sent!"); // replace it with your actual game start logic
});


/*

function updateJoinButton() {
    const player = players.find(p => p.id === currentUser.id);

    if (!player || player.status !== 'green') {
        joinBtn.textContent = "Join";
        joinBtn.style.backgroundColor = "#5865f2"; // blue
    } else {
        joinBtn.textContent = "Leave";
        joinBtn.style.backgroundColor = "#f04747"; // red
    }
}

async function joinActivityList() {
    let players = [];
    if (discordSdk.activity.state) {
        try {
            players = JSON.parse(discordSdk.activity.state);
        } catch {
            players = [];
        }
    }

    // Add current user if not already present
    if (!players.find(p => p.id === currentUser.id)) {
        players.push({ id: currentUser.id, name: currentUser.username, status: 'red' });
        await discordSdk.activity.update({ state: JSON.stringify(players) });
    }

    renderPlayers(players);
}
*/
init().catch(err => {
    console.error("Init failed:", err);
});