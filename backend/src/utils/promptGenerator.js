export const generateVariations = (basePrompt, numVariations) => {
    const variations = [];
    const styles = [
        'in watercolor style',
        'with neon accents',
        'in cyberpunk theme',
        'with abstract elements',
        'in minimalist design',
        'in oil painting style',
        'with surreal elements',
        'in pop art style',
        'with geometric patterns',
        'in vintage illustration style'
    ];

    const compositions = [
        'centered composition',
        'dynamic perspective',
        'close-up view',
        'wide landscape view',
        'symmetrical arrangement'
    ];

    for (let i = 0; i < numVariations; i++) {
        const style = styles[Math.floor(Math.random() * styles.length)];
        const composition = compositions[Math.floor(Math.random() * compositions.length)];
        variations.push({
            variation: `${basePrompt}, ${style}, ${composition}`
        });
    }

    return variations;
};
