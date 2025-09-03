/**
 * Calculator App
 */

(function () {
    // Register the calculator window type
    WindowManager.registerWindowType('calculator', {
        title: 'Calculator',
        defaultWidth: 240,
        defaultHeight: 320,

        // Update the calculator to use the inner content
        initContent: function (contentElement, options) {
            // Find the inner content area
            const innerContent = contentElement.querySelector('[id^="inner-content"]');
            if (!innerContent) {
                console.error('Inner content element not found');
                return;
            }

            // Create calculator UI
            innerContent.innerHTML = `
                <div class="calculator">
                    <div class="calc-display">0</div>
                    <div class="calc-buttons">
                        <button class="calc-btn calc-clear">C</button>
                        <button class="calc-btn calc-op">±</button>
                        <button class="calc-btn calc-op">%</button>
                        <button class="calc-btn calc-op">/</button>
                        
                        <button class="calc-btn calc-num">7</button>
                        <button class="calc-btn calc-num">8</button>
                        <button class="calc-btn calc-num">9</button>
                        <button class="calc-btn calc-op">*</button>
                        
                        <button class="calc-btn calc-num">4</button>
                        <button class="calc-btn calc-num">5</button>
                        <button class="calc-btn calc-num">6</button>
                        <button class="calc-btn calc-op">-</button>
                        
                        <button class="calc-btn calc-num">1</button>
                        <button class="calc-btn calc-num">2</button>
                        <button class="calc-btn calc-num">3</button>
                        <button class="calc-btn calc-op">+</button>
                        
                        <button class="calc-btn calc-num calc-zero">0</button>
                        <button class="calc-btn calc-num">.</button>
                        <button class="calc-btn calc-equals">=</button>
                    </div>
                </div>
            `;

            // Set up calculator logic
            let displayValue = '0';
            let firstOperand = null;
            let operator = null;
            let waitingForSecondOperand = false;

            const display = innerContent.querySelector('.calc-display');

            // Add event listeners
            innerContent.querySelectorAll('.calc-btn').forEach(button => {
                button.addEventListener('mousedown', e => {
                    e.stopPropagation(); // Prevent window drag
                });

                button.addEventListener('click', () => {
                    const value = button.textContent;

                    if (button.classList.contains('calc-num')) {
                        if (waitingForSecondOperand) {
                            displayValue = value;
                            waitingForSecondOperand = false;
                        } else {
                            displayValue = displayValue === '0' ? value : displayValue + value;
                        }
                    } else if (button.classList.contains('calc-op')) {
                        firstOperand = parseFloat(displayValue);
                        operator = value;
                        waitingForSecondOperand = true;
                    } else if (button.classList.contains('calc-equals')) {
                        if (operator && firstOperand !== null) {
                            const secondOperand = parseFloat(displayValue);
                            let result;

                            switch (operator) {
                                case '+': result = firstOperand + secondOperand; break;
                                case '-': result = firstOperand - secondOperand; break;
                                case '*': result = firstOperand * secondOperand; break;
                                case '/': result = firstOperand / secondOperand; break;
                                case '%': result = firstOperand % secondOperand; break;
                            }

                            displayValue = result.toString();
                            operator = null;
                        }
                    } else if (button.classList.contains('calc-clear')) {
                        displayValue = '0';
                        firstOperand = null;
                        operator = null;
                        waitingForSecondOperand = false;
                    }

                    display.textContent = displayValue;
                });
            });
        }
    });
})();