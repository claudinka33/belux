import type { Config } from "tailwindcss";

const config: Config = {
    content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
    theme: {
          extend: {
                  colors: {
                            belux: {
                                        50: "#fdf3f7",
                                        100: "#fbe7ef",
                                        200: "#f7cfdf",
                                        300: "#efa8c3",
                                        400: "#e37ba1",
                                        500: "#cf6d90",
                                        600: "#c25578",
                                        700: "#a53f60",
                                        800: "#883650",
                                        900: "#723046",
                                        950: "#451724",
                            },
                            cream: "#faf7f5",
                            ink: "#2f2a2d",
                  },
                  fontFamily: {
                            sans: ["Poppins", "ui-sans-serif", "system-ui", "sans-serif"],
                  },
                  boxShadow: {
                            soft: "0 8px 30px rgba(207,109,144,0.12)",
                            card: "0 2px 12px rgba(47,42,45,0.07)",
                  },
          },
    },
    plugins: [],
};
export default config;
