import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Supplier } from "@/modules/accounting/types";
import { STORAGE_KEYS } from "@/data/mock-data";

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 5;

  useEffect(() => {
    const data = localStorage.getItem(STORAGE_KEYS.suppliers);

    if (data) {
      const parsed: Supplier[] = JSON.parse(data);
      setSuppliers(parsed);
    }
  }, []);

  const normalizedSearch = search.trim().toLowerCase();

  const filteredSuppliers = suppliers.filter(
    (supplier) =>
      supplier.name.toLowerCase().includes(normalizedSearch) ||
      supplier.cui.toLowerCase().includes(normalizedSearch)
  );

  const sortedSuppliers = [...filteredSuppliers].sort((a,b) =>
    a.name.localeCompare(b.name)
  );

  const totalPages = Math.ceil(sortedSuppliers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;

  const paginatedSuppliers = sortedSuppliers.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  return (
    <>
      <Header>
        <h1 className="text-lg font-semibold">Furnizori</h1>
      </Header>

      <Main>
        <div className="mb-4">
          <input
            type="text"
            placeholder="Caută după nume sau CUI"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="border p-2 rounded w-full"
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Gestiune Furnizori</CardTitle>
          </CardHeader>

          <CardContent className="text-muted-foreground">
            {suppliers.length === 0 ? (
              <div>
                <p className="text-lg font-medium">
                  Nu există furnizori
                </p>
                <p className="text-sm">
                  Adaugă primul furnizor.
                </p>
              </div>
            ) : filteredSuppliers.length === 0 ? (
              <div>
                <p className="text-lg font-medium">
                  Niciun rezultat găsit.
                </p>
              </div>
            ) : (
              <>
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b bg-gray-100 text-left">
                      <th className="p-2">Nume</th>
                      <th className="p-2">CUI</th>
                      <th className="p-2">Adresă</th>
                      <th className="p-2">Telefon</th>
                      <th className="p-2">Cont bancar</th>
                      <th className="p-2">Email</th>
                    </tr>
                  </thead>

                  <tbody>
                    {paginatedSuppliers.map((supplier) => (
                      <tr key={supplier.id} className="border-b">
                        <td className="p-2">{supplier.name}</td>
                        <td className="p-2">{supplier.cui}</td>
                        <td className="p-2">{supplier.address}</td>
                        <td className="p-2">{supplier.phone}</td>
                        <td className="p-2">{supplier.bankAccount}</td>
                        <td className="p-2">{supplier.email}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="flex justify-between items-center mt-4">
                  <button
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(prev - 1, 1))
                    }
                    disabled={currentPage === 1}
                    className="border px-3 py-1 rounded disabled:opacity-50"
                  >
                    Previous
                  </button>

                  <span>
                    Pagina {currentPage} din {totalPages}
                  </span>

                  <button
                    onClick={() =>
                      setCurrentPage((prev) =>
                        Math.min(prev + 1, totalPages)
                      )
                    }
                    disabled={currentPage === totalPages}
                    className="border px-3 py-1 rounded disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </Main>
    </>
  );
}