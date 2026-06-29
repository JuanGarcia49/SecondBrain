import { useState } from 'react';

export default function MealEntryForm() {
    const [dishName, setDishName] = useState('');
    const [mealType, setMealType] = useState('Dinner');
    const [cookDate, setCookDate] = useState('');
    const [hasLeftovers, setHasLeftovers] = useState(false);
    const [transactionId, setTransactionId] = useState('');

    const [ingredients, setIngredients] = useState([]);
    const [currentIngredient, setCurrentIngredient] = useState('');

    const handleAddIngredient = (e) => {
        e.preventDefault();
        const trimmed = currentIngredient.trim();
        if (trimmed !== '' && !ingredients.includes(trimmed)) {
            setIngredients([...ingredients, trimmed]);
            setCurrentIngredient('');
        }
    };

    const handleRemoveIngredient = (ingredientToRemove) => {
        setIngredients(ingredients.filter(ing => ing !== ingredientToRemove));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const payload = {
            dish_name: dishName,
            meal_type: mealType,
            cook_date: cookDate,
            has_leftovers: hasLeftovers,
            transaction_id: transactionId === '' ? null : parseInt(transactionId),
            ingredients: ingredients
        };

        try {
            const response = await fetch('http://localhost:8000/meals', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                console.log("Success");
                setDishName('');
                setIngredients([]);
                setCurrentIngredient('');
                setTransactionId('');
            } else {
                console.log("Error");
            }
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5 max-w-2xl">
            <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1">
                    <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Dish Name</label>
                    <input
                        type="text"
                        value={dishName}
                        onChange={(e) => setDishName(e.target.value)}
                        required
                        className="bg-neutral-900 border border-neutral-600 focus:border-emerald-500 rounded-lg p-2.5 text-sm outline-none text-neutral-100 transition-colors"
                        placeholder="e.g., Tonkotsu Ramen"
                    />
                </div>

                <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1">
                    <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Meal Type</label>
                    <select
                        value={mealType}
                        onChange={(e) => setMealType(e.target.value)}
                        className="bg-neutral-900 border border-neutral-600 focus:border-emerald-500 rounded-lg p-2.5 text-sm outline-none text-neutral-100 transition-colors"
                    >
                        <option value="Lunch">Lunch</option>
                        <option value="Dinner">Dinner</option>
                    </select>
                </div>

                <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1">
                    <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Cook Date</label>
                    <input
                        type="date"
                        value={cookDate}
                        onChange={(e) => setCookDate(e.target.value)}
                        required
                        className="bg-neutral-900 border border-neutral-600 focus:border-emerald-500 rounded-lg p-2.5 text-sm outline-none text-neutral-100 transition-colors"
                    />
                </div>

                <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1">
                    <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Transaction ID</label>
                    <input
                        type="number"
                        value={transactionId}
                        onChange={(e) => setTransactionId(e.target.value)}
                        className="bg-neutral-900 border border-neutral-600 focus:border-emerald-500 rounded-lg p-2.5 text-sm outline-none text-neutral-100 transition-colors"
                        placeholder="Optional"
                    />
                </div>
            </div>

            <div className="flex items-center gap-3">
                <input
                    type="checkbox"
                    id="leftovers"
                    checked={hasLeftovers}
                    onChange={(e) => setHasLeftovers(e.target.checked)}
                    className="w-4 h-4 text-emerald-500 bg-neutral-900 border-neutral-600 rounded focus:ring-emerald-500"
                />
                <label htmlFor="leftovers" className="text-sm font-medium text-neutral-300 cursor-pointer">
                    Provides leftovers for next day
                </label>
            </div>

            <div className="flex flex-col gap-1.5 mt-2">
                <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Ingredients</label>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={currentIngredient}
                        onChange={(e) => setCurrentIngredient(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddIngredient(e);
                            }
                        }}
                        className="flex-1 bg-neutral-900 border border-neutral-600 focus:border-emerald-500 rounded-lg p-2.5 text-sm outline-none text-neutral-100 transition-colors"
                        placeholder="Type ingredient and press Enter"
                    />
                    <button
                        type="button"
                        onClick={handleAddIngredient}
                        className="px-5 py-2.5 bg-neutral-700 hover:bg-neutral-600 border border-neutral-600 rounded-lg text-sm transition-colors cursor-pointer text-neutral-200 font-medium"
                    >
                        Add
                    </button>
                </div>

                {ingredients.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                        {ingredients.map((ing) => (
                            <span
                                key={ing}
                                className="flex items-center gap-2 px-3 py-1 text-sm bg-emerald-900/30 text-emerald-400 border border-emerald-800/50 rounded-full"
                            >
                                {ing}
                                <button
                                    type="button"
                                    onClick={() => handleRemoveIngredient(ing)}
                                    className="text-emerald-500 hover:text-emerald-300 font-bold cursor-pointer"
                                >
                                    ×
                                </button>
                            </span>
                        ))}
                    </div>
                )}
            </div>

            <div className="flex justify-end pt-2">
                <button
                    type="submit"
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm transition-colors cursor-pointer font-semibold shadow-sm"
                >
                    Save Meal
                </button>
            </div>
        </form>
    );
}