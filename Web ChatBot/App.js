"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = App;
const react_1 = require("react");
const axios_1 = require("axios");
function App() {
    const [question, setQuestion] = (0, react_1.useState)("");
    const [answer, setAnswer] = (0, react_1.useState)("");
    const [loading, setLoading] = (0, react_1.useState)(false);
    const handleAsk = async () => {
        if (!question.trim())
            return;
        setLoading(true);
        setAnswer("");
        try {
            const response = await axios_1.default.post("http://localhost:5000/api/ask", { query: question });
            setAnswer(response.data.answer);
        }
        catch (error) {
            console.error("Error fetching response:", error);
            setAnswer("Eroare la primirea răspunsului. Încercați din nou.");
        }
        finally {
            setLoading(false);
        }
    };
    return (<div className="flex flex-col items-center p-8 space-y-4">
      <h1 className="text-2xl font-bold">Chatbot Azure AI</h1>
      <textarea className="w-full max-w-lg p-2 border rounded" rows={3} value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Introduceți întrebarea aici..."/>
      <button className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-400" onClick={handleAsk} disabled={loading}>
        {loading ? "Se încarcă..." : "Trimite"}
      </button>
      {answer && <div className="p-4 mt-4 border rounded max-w-lg">{answer}</div>}
    </div>);
}
