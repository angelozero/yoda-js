import { View } from './View';
import { Negociacoes } from '../models/Negociacoes';

export class NegociacoesView extends View<Negociacoes> {

    // update(model: Negociacoes): void {
    //     this._element.html(this.template(model));
    // }

    template(model: Negociacoes): string {
        return `
        <table class="table table-hover table-bordered">
            <thead>
                <tr>
                    <th>DATA</th>
                    <th>QUANTIDADE</th>
                    <th>VALOR</th>
                    <th>VOLUME</th>
                </tr>
            </thead>

            <tbody>
                ${model.getList().map(negociacao => {
            return `
                        <tr>
                        <td>${negociacao.data.getDate() + "/" + (negociacao.data.getMonth() + 1) + "/" + negociacao.data.getFullYear()}</td>
                        <td>${negociacao.quantidade}</td>
                        <td>${negociacao.valor}</td>
                        <td>${negociacao.volume}</td>
                        </tr>
                    `
            // join('') usado para não adicionar "," a cada negociação adicionada na view ( pagina )
        }).join('')}
            </tbody>

            <tfoot>
            </tfoot>
        </table>
        <script>alert('teste scape')</script>
        `;
    }
}