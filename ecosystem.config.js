module.exports = {
  apps: [
    {
      name: "emergency_web",
      cwd: "C:\\app\\emergency_web",
      script: "node_modules\\next\\dist\\bin\\next",
      args: "start -p 3001",
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      windowsHide: true
    },
  ],
};
